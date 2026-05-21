-- Migration 011: Missing indexes for frequently-filtered columns
-- Fixes: KI-004 (performance on period_scores upsert), KI-011 (dashboard queries)

-- Tasks: dashboard pending query + completed_by for member stats
CREATE INDEX IF NOT EXISTS idx_tasks_home_done
  ON tasks (home_id, done);

CREATE INDEX IF NOT EXISTS idx_tasks_completed_by
  ON tasks (home_id, completed_by);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks (home_id, assigned_to);

-- Shopping: dashboard pending count + completed_by for achievements
CREATE INDEX IF NOT EXISTS idx_shopping_home_done
  ON shopping_items (home_id, done);

CREATE INDEX IF NOT EXISTS idx_shopping_completed_by
  ON shopping_items (home_id, completed_by);

-- Home members: used in getUserAndHome() on every server action
CREATE INDEX IF NOT EXISTS idx_home_members_user
  ON home_members (user_id);

-- Member achievements: used in checkAndAwardAchievements
CREATE INDEX IF NOT EXISTS idx_member_achievements_user
  ON member_achievements (home_id, user_id);

-- Period scores: used in upsertPeriodScore and ranking queries
CREATE INDEX IF NOT EXISTS idx_period_scores_period_user
  ON period_scores (period_id, user_id);

CREATE INDEX IF NOT EXISTS idx_period_scores_user
  ON period_scores (home_id, user_id);

-- Invite links: used in join/[token] route handler
CREATE INDEX IF NOT EXISTS idx_invite_links_token
  ON invite_links (token);

-- House contributions: used in updateContributionPayment + achievements
CREATE INDEX IF NOT EXISTS idx_contributions_home_user
  ON house_contributions (home_id, user_id);

-- Ranking periods: used in getOrCreateActivePeriod
CREATE INDEX IF NOT EXISTS idx_ranking_periods_home_status
  ON ranking_periods (home_id, status);

-- Prize poll votes: used in vote count aggregation
CREATE INDEX IF NOT EXISTS idx_poll_votes_period
  ON prize_poll_votes (period_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option
  ON prize_poll_votes (option_id);
