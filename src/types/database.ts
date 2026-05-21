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
