"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { hasPermission } from "@/lib/security/authorization";
import { Permission } from "@/lib/security/permissions";
import { completeTask, uncompleteTask } from "@/lib/services/TaskService";
import type { Recurrence } from "@/types";

export async function createTask(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const assignedTo = formData.get("assigned_to") as string | null;
  const dueDate = formData.get("due_date") as string | null;
  const recurrence = (formData.get("recurrence") as Recurrence | null) || null;

  if (!title) return { error: "El título no puede estar vacío" };

  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.CREATE_TASK))
    return { error: "Sin permiso para crear tareas" };

  const { error } = await ctx.admin.from("tasks").insert({
    home_id: ctx.home.id,
    title,
    assigned_to: assignedTo || null,
    due_date: dueDate || null,
    created_by: ctx.user.id,
    recurrence: recurrence || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTask(id: string, done: boolean) {
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_TASK)) return;

  const { data: task } = await ctx.admin
    .from("tasks")
    .select("home_id, title, assigned_to, created_by, due_date, recurrence")
    .eq("id", id)
    .eq("home_id", ctx.home.id)
    .single();

  if (!task) return;

  if (done) {
    await completeTask(ctx.admin, id, ctx.user.id, task);
  } else {
    await uncompleteTask(ctx.admin, id);
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
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_TASK)) return;

  const payload: Record<string, unknown> = {};

  if ("due_date" in updates) {
    payload.due_date = updates.due_date || null;
  }

  if ("recurrence" in updates) {
    payload.recurrence = updates.recurrence || null;
  }

  if ("assigned_to" in updates) {
    const { data: current } = await ctx.admin
      .from("tasks")
      .select("assigned_to, original_assigned_to")
      .eq("id", id)
      .eq("home_id", ctx.home.id)
      .single();

    if (!current) return;

    payload.assigned_to = updates.assigned_to || null;

    if (current.assigned_to !== updates.assigned_to) {
      payload.original_assigned_to =
        current.original_assigned_to ?? current.assigned_to;
      payload.assignee_changed_by = ctx.user.id;
      payload.assignee_changed_at = new Date().toISOString();
    }
  }

  if (Object.keys(payload).length === 0) return;

  await ctx.admin
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .eq("home_id", ctx.home.id);

  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.DELETE_TASK)) return;

  await ctx.admin
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("home_id", ctx.home.id);
  revalidatePath("/tasks");
  revalidatePath("/");
}
