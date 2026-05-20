import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRankingData } from "@/lib/actions/gamification";
import RankingContent from "./_components/RankingContent";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: membershipRows }, { data: memberRows }] = await Promise.all([
    admin
      .from("home_members")
      .select("home_id, homes(name, created_by)")
      .eq("user_id", user.id)
      .limit(1),
    admin.from("profiles").select("id, name").eq("id", user.id).single(),
  ]);

  const membership = membershipRows?.[0] ?? null;
  const homeData = (
    membership as unknown as {
      home_id: string;
      homes: { name: string; created_by: string };
    } | null
  )?.homes ?? null;
  const homeId = membership?.home_id;
  const isAdmin = homeData?.created_by === user.id;

  if (!homeId) redirect("/create-home");

  const raw = await getRankingData(homeId);

  // Get all home members for display
  const { data: allMemberRows } = await admin
    .from("home_members")
    .select("user_id, profiles(name)")
    .eq("home_id", homeId);

  const members = (allMemberRows ?? []).map((m) => ({
    user_id: m.user_id,
    name: (m as unknown as { user_id: string; profiles: { name: string } }).profiles?.name ?? "",
  }));

  // Normalize profiles shape from Supabase (can come back as array in untyped queries)
  function normProfile(p: unknown): { name: string } | null {
    if (!p) return null;
    if (Array.isArray(p)) return p[0] ?? null;
    return p as { name: string };
  }

  const rankingData = {
    ...raw,
    scores: raw.scores?.map((s) => ({
      ...s,
      profiles: normProfile(s.profiles),
    })) ?? null,
  };

  return (
    <RankingContent
      {...rankingData}
      isAdmin={isAdmin}
      currentUserId={user.id}
      homeId={homeId}
      members={members}
      currentUserName={memberRows?.name ?? ""}
    />
  );
}
