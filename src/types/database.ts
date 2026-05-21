// Explicit types for Supabase join results.
// Replaces `as unknown as` casts throughout the codebase.
// These will be superseded by generated types once `supabase gen types typescript` is run.

export type HomeMemberWithHome = {
  id: string;
  home_id: string;
  homes: {
    name: string;
    created_by: string;
  } | null;
};

export type HomeMemberWithHomeName = {
  home_id: string;
  homes: { name: string } | null;
};

export type HomeMemberWithHomeFull = {
  home_id: string;
  homes: {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
  } | null;
};

export type MemberWithProfile = {
  user_id: string;
  profiles: { name: string } | null;
};

export type ScoreWithProfile = {
  user_id: string;
  tasks_points: number;
  shopping_points: number;
  finance_points: number;
  achievement_points: number;
  total_points: number;
  profiles: { name: string } | null;
};

// Fase 3: join with role + nested permissions via role_permissions
export type HomeMemberWithRoleAndPermissions = {
  id: string;
  home_id: string;
  homes: { name: string; created_by: string } | null;
  roles: {
    id: string;
    name: string;
    role_permissions: Array<{
      permissions: { key: string } | null;
    }>;
  } | null;
};

// Fase 3: member row including role for the roles panel
export type MemberWithRole = {
  id: string;
  user_id: string;
  role_id: string | null;
  profiles: { name: string } | null;
  roles: { id: string; name: string } | null;
};
