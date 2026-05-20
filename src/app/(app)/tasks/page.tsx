import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TaskList from "./_components/TaskList";
import type { TaskWithAssignee } from "@/types";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/create-home");

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", membership.home_id);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const [{ data: tasks }, { data: memberProfiles }] = await Promise.all([
    admin
      .from("tasks")
      .select(
        "id, title, done, assigned_to, created_by, created_at, home_id, completed_by, completed_at, due_date, original_assigned_to, assignee_changed_by, assignee_changed_at, recurrence",
      )
      .eq("home_id", membership.home_id)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id, name").in("id", memberIds),
  ]);

  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    profiles:
      (memberProfiles ?? []).find((p) => p.id === m.user_id) ?? null,
  }));

  const tasksWithAssignee: TaskWithAssignee[] = (tasks ?? []).map((t) => ({
    ...t,
    completed_by: t.completed_by ?? null,
    completed_at: t.completed_at ?? null,
    due_date: t.due_date ?? null,
    original_assigned_to: t.original_assigned_to ?? null,
    assignee_changed_by: t.assignee_changed_by ?? null,
    assignee_changed_at: t.assignee_changed_at ?? null,
    recurrence: (t.recurrence as import("@/types").Recurrence | null) ?? null,
    profiles: t.assigned_to
      ? ((memberProfiles ?? []).find((p) => p.id === t.assigned_to) ?? null)
      : null,
    completed_by_profile: t.completed_by
      ? ((memberProfiles ?? []).find((p) => p.id === t.completed_by) ?? null)
      : null,
  }));

  return (
    <TaskList
      tasks={tasksWithAssignee}
      members={members}
      currentUserId={user.id}
    />
  );
}
