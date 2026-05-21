"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";

export async function createSavingGoal(_: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const targetRaw = formData.get("target_amount") as string;
  const deadline = (formData.get("deadline") as string) || null;

  const targetAmount = parseFloat(
    targetRaw?.replace(/\./g, "").replace(",", "."),
  );
  if (!name || isNaN(targetAmount) || targetAmount <= 0)
    return { error: "Nombre y monto objetivo son requeridos" };

  const ctx = await getCurrentContext();

  const { error } = await ctx.admin.from("saving_goals").insert({
    home_id: ctx.home.id,
    name,
    target_amount: targetAmount,
    current_amount: 0,
    deadline: deadline || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/finance");
  revalidatePath("/finance/savings");
  return { success: true };
}

export async function addToSavingGoal(id: string, additionalAmount: number) {
  const ctx = await getCurrentContext();

  const { data: goal } = await ctx.admin
    .from("saving_goals")
    .select("current_amount, target_amount")
    .eq("id", id)
    .eq("home_id", ctx.home.id)
    .single();

  if (!goal) return;

  const newAmount = Math.min(
    Number(goal.current_amount) + additionalAmount,
    Number(goal.target_amount),
  );

  await ctx.admin
    .from("saving_goals")
    .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/finance");
  revalidatePath("/finance/savings");
}

export async function updateSavingGoal(
  id: string,
  updates: { name?: string; target_amount?: number; deadline?: string | null },
) {
  const ctx = await getCurrentContext();

  await ctx.admin
    .from("saving_goals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("home_id", ctx.home.id);

  revalidatePath("/finance");
  revalidatePath("/finance/savings");
}

export async function deleteSavingGoal(id: string) {
  const ctx = await getCurrentContext();
  await ctx.admin
    .from("saving_goals")
    .delete()
    .eq("id", id)
    .eq("home_id", ctx.home.id);
  revalidatePath("/finance");
  revalidatePath("/finance/savings");
}
