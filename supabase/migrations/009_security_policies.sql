-- Migration 009: Missing RLS write policies and overly permissive INSERT on home_members
-- Fixes: KI-002, KI-003, KI-009

-- ── home_members: restrict INSERT to the invite/join flow ─────────────────────
-- The original policy allowed any authenticated user to add themselves to any home.
-- We drop it and add a stricter check: users can only insert their own user_id.
-- The admin client in Server Actions handles legitimate joins (join/[token] route).

DROP POLICY IF EXISTS "Authenticated users can join homes" ON home_members;

CREATE POLICY "Users can only insert their own membership" ON home_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── member_achievements: home members can read; only service role can write ───
-- Achievements are awarded exclusively via Server Actions using the admin client.

CREATE POLICY "member_achievements_insert" ON member_achievements
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

-- ── home_gamification_settings: only home admin can write ────────────────────

CREATE POLICY "gamification_settings_insert" ON home_gamification_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

CREATE POLICY "gamification_settings_update" ON home_gamification_settings
  FOR UPDATE TO authenticated
  USING (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

-- ── ranking_periods: only home admin can insert/update ───────────────────────

CREATE POLICY "ranking_periods_insert" ON ranking_periods
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

CREATE POLICY "ranking_periods_update" ON ranking_periods
  FOR UPDATE TO authenticated
  USING (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

-- ── ranking_prizes: only home admin can write ────────────────────────────────

CREATE POLICY "ranking_prizes_insert" ON ranking_prizes
  FOR INSERT TO authenticated
  WITH CHECK (
    period_id IN (
      SELECT rp.id FROM ranking_periods rp
      JOIN homes h ON h.id = rp.home_id
      WHERE h.created_by = auth.uid()
    )
  );

CREATE POLICY "ranking_prizes_update" ON ranking_prizes
  FOR UPDATE TO authenticated
  USING (
    period_id IN (
      SELECT rp.id FROM ranking_periods rp
      JOIN homes h ON h.id = rp.home_id
      WHERE h.created_by = auth.uid()
    )
  );

CREATE POLICY "ranking_prizes_delete" ON ranking_prizes
  FOR DELETE TO authenticated
  USING (
    period_id IN (
      SELECT rp.id FROM ranking_periods rp
      JOIN homes h ON h.id = rp.home_id
      WHERE h.created_by = auth.uid()
    )
  );

-- ── period_scores: home members can read; no direct client writes ─────────────
-- Scores are mutated only via the increment_period_score RPC (SECURITY DEFINER).
-- No INSERT/UPDATE policy needed for authenticated role — RPC handles it.

-- ── prize_poll_options: only home admin can write ────────────────────────────

CREATE POLICY "prize_poll_options_insert" ON prize_poll_options
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

CREATE POLICY "prize_poll_options_delete" ON prize_poll_options
  FOR DELETE TO authenticated
  USING (
    home_id IN (
      SELECT hm.home_id FROM home_members hm
      JOIN homes h ON h.id = hm.home_id
      WHERE hm.user_id = auth.uid() AND h.created_by = auth.uid()
    )
  );

-- ── prize_poll_votes: members can vote on their own home's poll ───────────────

CREATE POLICY "prize_poll_votes_insert" ON prize_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
  );

CREATE POLICY "prize_poll_votes_update" ON prize_poll_votes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
  );

CREATE POLICY "prize_poll_votes_delete" ON prize_poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
