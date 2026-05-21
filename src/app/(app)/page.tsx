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

  const [{ data: profile }, { data: membershipRows }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", user.id).single(),
    admin
      .from("home_members")
      .select("home_id, homes(name, created_by)")
      .eq("user_id", user.id)
      .limit(1),
  ]);

  const membership = membershipRows?.[0] ?? null;
  const homeId = membership?.home_id;
  const homeData = (membership as unknown as { home_id: string; homes: { name: string; created_by: string } } | null)?.homes ?? null;
  const homeName = homeData?.name ?? "Mi hogar";
  const isAdmin = homeData?.created_by === user.id;

  if (!homeId) redirect("/create-home");

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", homeId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const n = new Date();
  const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;

  // Split queries: COUNT for metrics, limit(5) for display — avoids loading all tasks (fixes KI-011)
  const [
    { data: pendingTasksRaw },
    { count: tasksDoneCount },
    { count: tasksPendingCount },
    { data: memberProfiles },
    { data: shoppingItems },
  ] = await Promise.all([
    admin
      .from("tasks")
      .select(
        "id, title, done, assigned_to, created_by, created_at, home_id, completed_by, completed_at, due_date, original_assigned_to, assignee_changed_by, assignee_changed_at",
      )
      .eq("home_id", homeId)
      .eq("done", false)
      .or(`due_date.is.null,due_date.lte.${todayStr}`)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("done", true),
    admin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("done", false)
      .or(`due_date.is.null,due_date.lte.${todayStr}`),
    admin.from("profiles").select("id, name").in("id", memberIds),
    admin
      .from("shopping_items")
      .select("id, done")
      .eq("home_id", homeId),
  ]);

  const pendingTasks = (pendingTasksRaw ?? []).map((t) => ({
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

  const shoppingPendingCount = (shoppingItems ?? []).filter((i) => !i.done).length;

  // Per-member stats via COUNT queries — accurate without loading all task rows
  const memberStats: MemberStat[] = await Promise.all(
    (memberProfiles ?? []).map(async (p) => {
      const [{ count: pending }, { count: done }] = await Promise.all([
        admin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("home_id", homeId)
          .eq("assigned_to", p.id)
          .eq("done", false),
        admin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("home_id", homeId)
          .eq("completed_by", p.id),
      ]);
      return { user_id: p.id, name: p.name, pending: pending ?? 0, done: done ?? 0 };
    }),
  );

  return (
    <DashboardContent
      userName={profile?.name ?? ""}
      homeName={homeName}
      pendingTasks={pendingTasks as TaskWithAssignee[]}
      tasksDoneCount={tasksDoneCount ?? 0}
      tasksPendingCount={tasksPendingCount ?? 0}
      shoppingPendingCount={shoppingPendingCount}
      memberStats={memberStats}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  );
}
