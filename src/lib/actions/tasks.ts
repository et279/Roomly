"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function createTask(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const assignedTo = formData.get("assigned_to") as string | null;
  const dueDate = formData.get("due_date") as string | null;

  if (!title) return { error: "El título no puede estar vacío" };

  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("tasks").insert({
    home_id: homeId,
    title,
    assigned_to: assignedTo || null,
    due_date: dueDate || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTask(id: string, done: boolean) {
  const { user, admin } = await getUserAndHome();
  await admin
    .from("tasks")
    .update({
      done,
      completed_by: done ? user.id : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function updateTask(
  id: string,
  updates: { assigned_to?: string | null; due_date?: string | null },
) {
  const { user, admin } = await getUserAndHome();

  const payload: Record<string, unknown> = {};

  if ("due_date" in updates) {
    payload.due_date = updates.due_date || null;
  }

  if ("assigned_to" in updates) {
    const { data: current } = await admin
      .from("tasks")
      .select("assigned_to, original_assigned_to")
      .eq("id", id)
      .single();

    payload.assigned_to = updates.assigned_to || null;

    if (current && current.assigned_to !== updates.assigned_to) {
      payload.original_assigned_to =
        current.original_assigned_to ?? current.assigned_to;
      payload.assignee_changed_by = user.id;
      payload.assignee_changed_at = new Date().toISOString();
    }
  }

  if (Object.keys(payload).length === 0) return;

  await admin.from("tasks").update(payload).eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("tasks").delete().eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
}
