export type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
};

export type Home = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type HomeMember = {
  id: string;
  home_id: string;
  user_id: string;
  joined_at: string;
};

export type Invitation = {
  id: string;
  home_id: string;
  email: string;
  invited_by: string;
  status: "pending" | "accepted";
  created_at: string;
};

export type HomeWithMembers = Home & {
  home_members: HomeMember[];
};

export type Recurrence = "daily" | "weekly" | "biweekly" | "monthly";

export type Task = {
  id: string;
  home_id: string;
  title: string;
  assigned_to: string | null;
  done: boolean;
  created_by: string;
  created_at: string;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;
  original_assigned_to: string | null;
  assignee_changed_by: string | null;
  assignee_changed_at: string | null;
  recurrence: Recurrence | null;
};

export type TaskWithAssignee = Task & {
  profiles: { name: string } | null;
  completed_by_profile?: { name: string } | null;
};

export type ShoppingItem = {
  id: string;
  home_id: string;
  title: string;
  quantity: string | null;
  added_by: string | null;
  done: boolean;
  created_at: string;
};

export type ShoppingItemWithAdder = ShoppingItem & {
  profiles: { name: string } | null;
};

export type MemberStat = {
  user_id: string;
  name: string;
  pending: number;
  done: number;
};

// ── Finanzas del Hogar ─────────────────────────────────────

export type FinancialRecordType =
  | "income"
  | "expense"
  | "saving"
  | "transfer"
  | "adjustment";

export type ContributionStatus = "paid" | "partial" | "pending" | "overdue";

export type ExpenseCategory = {
  id: string;
  home_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
};

export type FinancialRecord = {
  id: string;
  home_id: string;
  user_id: string;
  type: FinancialRecordType;
  amount: number;
  category_id: string | null;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

export type FinancialRecordWithDetails = FinancialRecord & {
  profiles: { name: string } | null;
  expense_categories: { name: string; icon: string; color: string } | null;
};

export type HouseContribution = {
  id: string;
  home_id: string;
  user_id: string;
  amount: number;
  paid_amount: number;
  status: ContributionStatus;
  due_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseContributionWithProfile = HouseContribution & {
  profiles: { name: string } | null;
};

export type SavingGoal = {
  id: string;
  home_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceMetrics = {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  monthlySavings: number;
  topCategory: { name: string; icon: string; color: string; total: number } | null;
  expensesByCategory: { category: ExpenseCategory | null; total: number }[];
};

export type UserBalance = {
  userId: string;
  name: string;
  totalPaid: number;
  owes: number;
  isCreditor: boolean;
};

// ── Gamification ────────────────────────────────────────────────────────────

export type AchievementCategory = "tasks" | "shopping" | "finance" | "ranking" | "general";
export type PeriodType = "biweekly" | "monthly";
export type PeriodStatus = "active" | "closed";
export type AchievementCondition = "tasks_completed" | "shopping_done" | "contributions_paid" | "periods_won";

export type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  condition_type: AchievementCondition;
  condition_value: number;
};

export type AchievementWithStatus = Achievement & {
  earned: boolean;
  earned_at: string | null;
};

export type GamificationSettings = {
  id: string;
  home_id: string;
  enabled: boolean;
  period_type: PeriodType;
};

export type RankingPeriod = {
  id: string;
  home_id: string;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  created_by: string;
  created_at: string;
};

export type RankingPrize = {
  id: string;
  period_id: string;
  rank: number;
  prize_description: string;
};

export type PeriodScore = {
  id: string;
  period_id: string;
  home_id: string;
  user_id: string;
  tasks_points: number;
  shopping_points: number;
  finance_points: number;
  achievement_points: number;
  total_points: number;
  final_rank: number | null;
};

export type PeriodScoreWithProfile = PeriodScore & {
  profiles: { name: string } | null;
};

export type ActivityCounters = {
  tasks_completed: number;
  shopping_done: number;
  contributions_paid: number;
  periods_won: number;
};

export type PrizePollOption = {
  id: string;
  period_id: string;
  home_id: string;
  option_text: string;
  vote_count: number;
};
