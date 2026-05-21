import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentContext } from "@/lib/context/context";
import { Permission } from "@/lib/security/permissions";
import DashboardContent from "./_components/DashboardContent";
import type { TaskWithAssignee, MemberStat } from "@/types";

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  const { user, home, permissions, admin } = ctx;

  const canManageInvites = permissions.includes(Permission.MANAGE_INVITES);
  const canManageMembers = permissions.includes(Permission.MANAGE_MEMBERS);

  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", home.id);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const n = new Date();
  const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;

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
      .eq("home_id", home.id)
      .eq("done", false)
      .or(`due_date.is.null,due_date.lte.${todayStr}`)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("home_id", home.id)
      .eq("done", true),
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("home_id", home.id)
      .eq("done", false)
      .or(`due_date.is.null,due_date.lte.${todayStr}`),
    admin.from("profiles").select("id, name").in("id", memberIds),
    admin.from("shopping_items").select("id, done").eq("home_id", home.id),
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

  const memberStats: MemberStat[] = await Promise.all(
    (memberProfiles ?? []).map(async (p) => {
      const [{ count: pending }, { count: done }] = await Promise.all([
        admin
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("home_id", home.id)
          .eq("assigned_to", p.id)
          .eq("done", false),
        admin
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("home_id", home.id)
          .eq("completed_by", p.id),
      ]);
      return { user_id: p.id, name: p.name, pending: pending ?? 0, done: done ?? 0 };
    }),
  );

  return (
    <DashboardContent
      userName={profile?.name ?? ""}
      homeName={home.name}
      pendingTasks={pendingTasks as TaskWithAssignee[]}
      tasksDoneCount={tasksDoneCount ?? 0}
      tasksPendingCount={tasksPendingCount ?? 0}
      shoppingPendingCount={shoppingPendingCount}
      memberStats={memberStats}
      canManageInvites={canManageInvites}
      canManageMembers={canManageMembers}
      currentUserId={user.id}
    />
  );
}
