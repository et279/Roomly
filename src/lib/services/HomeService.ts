import { createAdminClient } from "@/lib/supabase/admin";
import type { HomeMemberWithHomeFull } from "@/types/database";

export async function getCurrentHome(userId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("home_members")
    .select("homes(id, name, created_by, created_at)")
    .eq("user_id", userId)
    .single();

  const row = data as unknown as HomeMemberWithHomeFull | null;
  return row?.homes ?? null;
}
