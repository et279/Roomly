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
};

export type TaskWithAssignee = Task & {
  profiles: { name: string } | null;
};
