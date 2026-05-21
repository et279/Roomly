-- Migration 010: Atomic operations via PostgreSQL functions
-- Fixes: KI-004 (race condition in upsertPeriodScore), KI-005 (non-atomic closePeriod)

-- ── increment_period_score ────────────────────────────────────────────────────
-- Atomically increments score columns using INSERT ... ON CONFLICT DO UPDATE.
-- Eliminates the read-then-write race condition (KI-004): concurrent calls
-- increment from the DB-level value, not a value read in application code.
-- SECURITY DEFINER: runs with owner privileges, bypasses RLS.

CREATE OR REPLACE FUNCTION increment_period_score(
  p_period_id        uuid,
  p_home_id          uuid,
  p_user_id          uuid,
  p_tasks_points     int DEFAULT 0,
  p_shopping_points  int DEFAULT 0,
  p_finance_points   int DEFAULT 0,
  p_achievement_points int DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO period_scores (
    period_id, home_id, user_id,
    tasks_points, shopping_points, finance_points, achievement_points,
    total_points, updated_at
  ) VALUES (
    p_period_id, p_home_id, p_user_id,
    p_tasks_points, p_shopping_points, p_finance_points, p_achievement_points,
    p_tasks_points + p_shopping_points + p_finance_points + p_achievement_points,
    now()
  )
  ON CONFLICT (period_id, user_id) DO UPDATE SET
    tasks_points       = period_scores.tasks_points       + EXCLUDED.tasks_points,
    shopping_points    = period_scores.shopping_points    + EXCLUDED.shopping_points,
    finance_points     = period_scores.finance_points     + EXCLUDED.finance_points,
    achievement_points = period_scores.achievement_points + EXCLUDED.achievement_points,
    total_points       = period_scores.total_points
                         + EXCLUDED.tasks_points
                         + EXCLUDED.shopping_points
                         + EXCLUDED.finance_points
                         + EXCLUDED.achievement_points,
    updated_at = now();
END;
$$;

-- ── close_period_atomic ───────────────────────────────────────────────────────
-- Closes a ranking period within a single transaction:
--   1. Verifies caller is the home admin
--   2. Assigns final_rank to all period_scores (ordered by total_points DESC)
--   3. Applies winning poll option as rank-1 prize (if poll exists)
--   4. Marks the period as "closed"
-- Returns a JSONB with { success, winner_id, home_id } or { error }.
-- Achievement awarding for the winner is done in application code after this call
-- (it is idempotent and does not need to be inside the transaction).
-- SECURITY DEFINER: runs with owner privileges, bypasses RLS.

CREATE OR REPLACE FUNCTION close_period_atomic(
  p_period_id            uuid,
  p_requesting_user_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_home_id    uuid;
  v_admin_id   uuid;
  v_winner_id  uuid;
  v_rank       integer := 1;
  v_score      record;
BEGIN
  -- Verify period exists and caller is the home admin
  SELECT rp.home_id, h.created_by
    INTO v_home_id, v_admin_id
    FROM ranking_periods rp
    JOIN homes h ON h.id = rp.home_id
    WHERE rp.id = p_period_id AND rp.status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Período no encontrado o ya cerrado');
  END IF;

  IF v_admin_id IS DISTINCT FROM p_requesting_user_id THEN
    RETURN jsonb_build_object('error', 'Solo el admin puede cerrar el período');
  END IF;

  -- Assign final ranks ordered by total_points DESC; track winner
  FOR v_score IN
    SELECT id, user_id
      FROM period_scores
      WHERE period_id = p_period_id
      ORDER BY total_points DESC
  LOOP
    UPDATE period_scores SET final_rank = v_rank WHERE id = v_score.id;
    IF v_rank = 1 THEN
      v_winner_id := v_score.user_id;
    END IF;
    v_rank := v_rank + 1;
  END LOOP;

  -- Apply winning poll option as rank-1 prize (only if a poll exists)
  IF EXISTS (SELECT 1 FROM prize_poll_options WHERE period_id = p_period_id) THEN
    INSERT INTO ranking_prizes (period_id, rank, prize_description)
    SELECT p_period_id, 1, ppo.option_text
      FROM prize_poll_options ppo
      LEFT JOIN prize_poll_votes ppv ON ppv.option_id = ppo.id
      WHERE ppo.period_id = p_period_id
      GROUP BY ppo.id, ppo.option_text
      ORDER BY COUNT(ppv.id) DESC
      LIMIT 1
    ON CONFLICT (period_id, rank)
      DO UPDATE SET prize_description = EXCLUDED.prize_description;
  END IF;

  -- Mark period as closed (all of the above is in the same transaction)
  UPDATE ranking_periods SET status = 'closed' WHERE id = p_period_id;

  RETURN jsonb_build_object(
    'success',   true,
    'winner_id', v_winner_id,
    'home_id',   v_home_id
  );
END;
$$;

-- Grant execute to authenticated role so the Supabase admin client can call via rpc()
GRANT EXECUTE ON FUNCTION increment_period_score TO authenticated;
GRANT EXECUTE ON FUNCTION close_period_atomic TO authenticated;
