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
