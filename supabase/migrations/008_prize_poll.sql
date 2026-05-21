-- Prize poll: members vote for the 1st place prize of the active ranking period

CREATE TABLE IF NOT EXISTS prize_poll_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid NOT NULL REFERENCES ranking_periods(id) ON DELETE CASCADE,
  home_id     uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prize_poll_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id   uuid NOT NULL REFERENCES prize_poll_options(id) ON DELETE CASCADE,
  period_id   uuid NOT NULL REFERENCES ranking_periods(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_id     uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, user_id)
);

ALTER TABLE prize_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prize_poll_options_read" ON prize_poll_options
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));

CREATE POLICY "prize_poll_votes_read" ON prize_poll_votes
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));
