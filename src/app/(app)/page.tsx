import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardContent from "./_components/DashboardContent";
import type { TaskWithAssignee } from "@/types";

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
      .select("home_id, homes(name)")
      .eq("user_id", user.id)
      .single(),
  ]);

  const homeId = membership?.home_id;
  const homeName =
    (membership?.homes as unknown as { name: string } | null)?.name ??
    "Mi hogar";

  const { data: tasks } = homeId
    ? await admin
        .from("tasks")
        .select("id, title, done, assigned_to, created_by, created_at, home_id")
        .eq("home_id", homeId)
        .eq("done", false)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const assigneeIds = (tasks ?? [])
    .map((t) => t.assigned_to)
    .filter(Boolean) as string[];

  const { data: assigneeProfiles } =
    assigneeIds.length > 0
      ? await admin.from("profiles").select("id, name").in("id", assigneeIds)
      : { data: [] };

  const pendingTasks = (tasks ?? []).map((t) => ({
    ...t,
    profiles: t.assigned_to
      ? ((assigneeProfiles ?? []).find((p) => p.id === t.assigned_to) ?? null)
      : null,
  }));

  return (
    <DashboardContent
      userName={profile?.name ?? ""}
      homeName={homeName}
      pendingTasks={pendingTasks as unknown as TaskWithAssignee[]}
    />
  );
}
