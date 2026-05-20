import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ContributionsList from "./_components/ContributionsList";
import type { HouseContributionWithProfile } from "@/types";

export default async function ContributionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: membershipRows } = await admin
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .limit(1);

  const homeId = membershipRows?.[0]?.home_id;
  if (!homeId) redirect("/create-home");

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", homeId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const [{ data: contributions }, { data: memberProfiles }] = await Promise.all([
    admin
      .from("house_contributions")
      .select("*, profiles(name)")
      .eq("home_id", homeId)
      .order("due_date", { ascending: false }),
    admin.from("profiles").select("id, name").in("id", memberIds),
  ]);

  return (
    <ContributionsList
      contributions={(contributions ?? []) as HouseContributionWithProfile[]}
      members={(memberProfiles ?? []).map((p) => ({ user_id: p.id, name: p.name }))}
      currentUserId={user.id}
    />
  );
}
