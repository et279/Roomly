import { getCurrentContext } from "@/lib/context/context";
import { Permission } from "@/lib/security/permissions";
import { getRankingData } from "@/lib/actions/gamification";
import RankingContent from "./_components/RankingContent";
import type { MemberWithProfile } from "@/types/database";

export default async function RankingPage() {
  const ctx = await getCurrentContext();
  const { user, home, permissions, admin } = ctx;

  const isAdmin = permissions.includes(Permission.MANAGE_GAMIFICATION);

  const [raw, { data: memberRows }, { data: profileRow }] = await Promise.all([
    getRankingData(home.id, user.id),
    admin
      .from("home_members")
      .select("user_id, profiles(name)")
      .eq("home_id", home.id),
    admin.from("profiles").select("id, name").eq("id", user.id).single(),
  ]);

  const members = ((memberRows as MemberWithProfile[]) ?? []).map((m) => ({
    user_id: m.user_id,
    name: m.profiles?.name ?? "",
  }));

  function normProfile(p: unknown): { name: string } | null {
    if (!p) return null;
    if (Array.isArray(p)) return p[0] ?? null;
    return p as { name: string };
  }

  const rankingData = {
    ...raw,
    scores:
      raw.scores?.map((s) => ({
        ...s,
        profiles: normProfile(s.profiles),
      })) ?? null,
  };

  return (
    <RankingContent
      {...rankingData}
      isAdmin={isAdmin}
      currentUserId={user.id}
      homeId={home.id}
      members={members}
      currentUserName={profileRow?.name ?? ""}
    />
  );
}
