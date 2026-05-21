"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import type { Recurrence } from "@/types";
import { awardTaskPoints } from "@/lib/actions/gamification";

async function getUserAndHome() {
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

  return { user, homeId: membership?.home_id ?? null, admin };
}

function nextDueDate(current: string | null, recurrence: Recurrence): string {
  const base = current ? new Date(current + "T00:00:00") : new Date();
  switch (recurrence) {
    case "daily":
      base.setDate(base.getDate() + 1);
      break;
    case "weekly":
      base.setDate(base.getDate() + 7);
      break;
    case "biweekly":
      base.setDate(base.getDate() + 14);
      break;
    case "monthly":
      base.setMonth(base.getMonth() + 1);
      break;
  }
  return base.toISOString().split("T")[0];
}

export async function createTask(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const assignedTo = formData.get("assigned_to") as string | null;
  const dueDate = formData.get("due_date") as string | null;
  const recurrence = (formData.get("recurrence") as Recurrence | null) || null;

  if (!title) return { error: "El título no puede estar vacío" };

  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("tasks").insert({
    home_id: homeId,
    title,
    assigned_to: assignedTo || null,
    due_date: dueDate || null,
    created_by: user.id,
    recurrence: recurrence || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTask(id: string, done: boolean) {
  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return;

  // Read first to verify ownership and get details needed for recurrence + points
  const { data: task } = await admin
    .from("tasks")
    .select("home_id, title, assigned_to, created_by, due_date, recurrence")
    .eq("id", id)
    .eq("home_id", homeId)
    .single();

  if (!task) return;

  await admin
    .from("tasks")
    .update({
      done,
      completed_by: done ? user.id : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (done) {
    const completedAt = new Date().toISOString();

    awardTaskPoints(user.id, task.home_id, task.due_date, completedAt).catch(
      (e) =>
        logger.error("gamification", "awardTaskPoints failed", {
          userId: user.id,
          homeId: task.home_id,
          error: e,
        }),
    );

    if (task.recurrence) {
      await admin.from("tasks").insert({
        home_id: task.home_id,
        title: task.title,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        due_date: nextDueDate(task.due_date, task.recurrence as Recurrence),
        recurrence: task.recurrence,
        done: false,
      });
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function updateTask(
  id: string,
  updates: {
    assigned_to?: string | null;
    due_date?: string | null;
    recurrence?: Recurrence | null;
  },
) {
  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return;

  const payload: Record<string, unknown> = {};

  if ("due_date" in updates) {
    payload.due_date = updates.due_date || null;
  }

  if ("recurrence" in updates) {
    payload.recurrence = updates.recurrence || null;
  }

  if ("assigned_to" in updates) {
    const { data: current } = await admin
      .from("tasks")
      .select("assigned_to, original_assigned_to")
      .eq("id", id)
      .eq("home_id", homeId)
      .single();

    if (!current) return;

    payload.assigned_to = updates.assigned_to || null;

    if (current.assigned_to !== updates.assigned_to) {
      payload.original_assigned_to =
        current.original_assigned_to ?? current.assigned_to;
      payload.assignee_changed_by = user.id;
      payload.assignee_changed_at = new Date().toISOString();
    }
  }

  if (Object.keys(payload).length === 0) return;

  await admin.from("tasks").update(payload).eq("id", id).eq("home_id", homeId);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return;
  await admin.from("tasks").delete().eq("id", id).eq("home_id", homeId);
  revalidatePath("/tasks");
  revalidatePath("/");
}
