-- ── Gamification: Achievements, Ranking & Prizes ────────────────────────────

-- Track who marked shopping items as done (needed for shopping achievement counts)
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES profiles(id);

-- ── Achievements Catalog ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key            text UNIQUE NOT NULL,
  name           text NOT NULL,
  description    text NOT NULL,
  icon           text NOT NULL DEFAULT '⭐',
  category       text NOT NULL DEFAULT 'general' CHECK (category IN ('tasks','shopping','finance','ranking','general')),
  points         integer NOT NULL DEFAULT 10,
  condition_type text NOT NULL,               -- 'tasks_completed' | 'shopping_done' | 'contributions_paid' | 'periods_won'
  condition_value integer NOT NULL DEFAULT 1
);

INSERT INTO achievements (key, name, description, icon, category, points, condition_type, condition_value) VALUES
  ('first_task',       'Primer Paso',    'Completá tu primera tarea',        '✅', 'tasks',    15,  'tasks_completed',    1),
  ('task_10',          'Imparable',      'Completá 10 tareas',               '🔥', 'tasks',    50,  'tasks_completed',   10),
  ('task_50',          'Dedicado',       'Completá 50 tareas',               '💪', 'tasks',   120,  'tasks_completed',   50),
  ('task_100',         'Centurión',      'Completá 100 tareas',              '🏆', 'tasks',   250,  'tasks_completed',  100),
  ('shopping_10',      'Comprador',      'Completá 10 ítems de compras',     '🛒', 'shopping',  30, 'shopping_done',      10),
  ('shopping_50',      'Comprador Pro',  'Completá 50 ítems de compras',     '🛍️', 'shopping',  80, 'shopping_done',      50),
  ('contribution_1',   'Al Día',         'Pagá tu primera cuota a tiempo',   '💰', 'finance',   35, 'contributions_paid',  1),
  ('contribution_3',   'Responsable',    'Pagá 3 cuotas',                    '💳', 'finance',   75, 'contributions_paid',  3),
  ('contribution_10',  'Sin Deudas',     'Pagá 10 cuotas',                   '🏦', 'finance',  200, 'contributions_paid', 10),
  ('ranking_1st',      'Campeón',        'Ganá un período de ranking',       '🥇', 'ranking',  100, 'periods_won',         1),
  ('ranking_3rd',      'Imbatible',      'Ganá 3 períodos de ranking',       '👑', 'ranking',  300, 'periods_won',         3)
ON CONFLICT (key) DO NOTHING;

-- ── Member Achievements (earned) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id        uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(home_id, user_id, achievement_id)
);

-- ── Home Gamification Settings ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS home_gamification_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id     uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE UNIQUE,
  enabled     boolean NOT NULL DEFAULT false,
  period_type text NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('biweekly', 'monthly')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Ranking Periods ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranking_periods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id     uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  period_type text NOT NULL CHECK (period_type IN ('biweekly', 'monthly')),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Ranking Prizes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranking_prizes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id         uuid NOT NULL REFERENCES ranking_periods(id) ON DELETE CASCADE,
  rank              integer NOT NULL CHECK (rank > 0),
  prize_description text NOT NULL,
  UNIQUE(period_id, rank)
);

-- ── Period Scores ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS period_scores (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id          uuid NOT NULL REFERENCES ranking_periods(id) ON DELETE CASCADE,
  home_id            uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tasks_points       integer NOT NULL DEFAULT 0,
  shopping_points    integer NOT NULL DEFAULT 0,
  finance_points     integer NOT NULL DEFAULT 0,
  achievement_points integer NOT NULL DEFAULT 0,
  total_points       integer NOT NULL DEFAULT 0,
  final_rank         integer,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, user_id)
);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_gamification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_scores ENABLE ROW LEVEL SECURITY;

-- Achievements catalog: all authenticated users can read
CREATE POLICY "achievements_read" ON achievements
  FOR SELECT TO authenticated USING (true);

-- Member achievements: members of the same home
CREATE POLICY "member_achievements_read" ON member_achievements
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));

-- Home gamification settings: members of the same home
CREATE POLICY "home_gamification_settings_read" ON home_gamification_settings
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));

-- Ranking periods: members of the same home
CREATE POLICY "ranking_periods_read" ON ranking_periods
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));

-- Ranking prizes: members of the same home (via period)
CREATE POLICY "ranking_prizes_read" ON ranking_prizes
  FOR SELECT TO authenticated
  USING (period_id IN (
    SELECT rp.id FROM ranking_periods rp
    WHERE rp.home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
  ));

-- Period scores: members of the same home
CREATE POLICY "period_scores_read" ON period_scores
  FOR SELECT TO authenticated
  USING (home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid()));
