import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardContent from "./_components/DashboardContent";
import type { TaskWithAssignee, MemberStat } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", user.id).single(),
    admin
      .from("home_members")
      .select("home_id, homes(name, created_by)")
      .eq("user_id", user.id)
      .single(),
  ]);

  const homeId = membership?.home_id;
  const homeData = membership?.homes as unknown as { name: string; created_by: string } | null;
  const homeName = homeData?.name ?? "Mi hogar";
  const isAdmin = homeData?.created_by === user.id;

  if (!homeId) redirect("/create-home");

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", homeId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const [
    { data: tasks },
    { data: memberProfiles },
    { data: shoppingItems },
  ] = await Promise.all([
    admin
      .from("tasks")
      .select("id, title, done, assigned_to, created_by, created_at, home_id, completed_by, completed_at, due_date, original_assigned_to, assignee_changed_by, assignee_changed_at")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id, name").in("id", memberIds),
    admin
      .from("shopping_items")
      .select("id, done")
      .eq("home_id", homeId),
  ]);

  const pendingTasks = (tasks ?? [])
    .filter((t) => !t.done)
    .slice(0, 5)
    .map((t) => ({
      ...t,
      completed_by: t.completed_by ?? null,
      completed_at: t.completed_at ?? null,
      due_date: t.due_date ?? null,
      original_assigned_to: t.original_assigned_to ?? null,
      assignee_changed_by: t.assignee_changed_by ?? null,
      assignee_changed_at: t.assignee_changed_at ?? null,
      profiles: t.assigned_to
        ? ((memberProfiles ?? []).find((p) => p.id === t.assigned_to) ?? null)
        : null,
      completed_by_profile: null,
    }));

  const tasksDoneCount = (tasks ?? []).filter((t) => t.done).length;
  const tasksPendingCount = (tasks ?? []).filter((t) => !t.done).length;
  const shoppingPendingCount = (shoppingItems ?? []).filter((i) => !i.done).length;

  // Member leaderboard: tasks done per member
  const memberStats: MemberStat[] = (memberProfiles ?? []).map((p) => {
    const memberTasks = (tasks ?? []).filter(
      (t) => t.completed_by === p.id || t.assigned_to === p.id
    );
    return {
      user_id: p.id,
      name: p.name,
      pending: memberTasks.filter((t) => !t.done).length,
      done: (tasks ?? []).filter((t) => t.completed_by === p.id).length,
    };
  });

  return (
    <DashboardContent
      userName={profile?.name ?? ""}
      homeName={homeName}
      pendingTasks={pendingTasks as TaskWithAssignee[]}
      tasksDoneCount={tasksDoneCount}
      tasksPendingCount={tasksPendingCount}
      shoppingPendingCount={shoppingPendingCount}
      memberStats={memberStats}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}
