import type { AdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import { awardTaskPoints } from "./GamificationService";
import type { Recurrence } from "@/types";

type TaskRow = {
  home_id: string;
  title: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  recurrence: string | null;
};

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

export async function completeTask(
  admin: AdminClient,
  taskId: string,
  userId: string,
  task: TaskRow,
): Promise<void> {
  const completedAt = new Date().toISOString();

  await admin
    .from("tasks")
    .update({ done: true, completed_by: userId, completed_at: completedAt })
    .eq("id", taskId);

  awardTaskPoints(userId, task.home_id, task.due_date, completedAt).catch((e) =>
    logger.error("gamification", "awardTaskPoints failed", {
      userId,
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

export async function uncompleteTask(admin: AdminClient, taskId: string): Promise<void> {
  await admin
    .from("tasks")
    .update({ done: false, completed_by: null, completed_at: null })
    .eq("id", taskId);
}
