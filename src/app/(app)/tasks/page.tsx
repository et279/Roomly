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
      .select("id, title, done, assigned_to, created_by, created_at, home_id")
      .eq("home_id", membership.home_id)
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, name")
      .in("id", memberIds),
  ]);

  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id,
    profiles:
      (memberProfiles ?? []).find((p) => p.id === m.user_id) ?? null,
  }));

  const tasksWithAssignee = (tasks ?? []).map((t) => ({
    ...t,
    profiles: t.assigned_to
      ? ((memberProfiles ?? []).find((p) => p.id === t.assigned_to) ?? null)
      : null,
  }));

  return (
    <TaskList
      tasks={tasksWithAssignee as unknown as TaskWithAssignee[]}
      members={members}
      currentUserId={user.id}
    />
  );
}
