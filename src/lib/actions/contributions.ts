"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { resolveContributionStatus, applyContributionPayment } from "@/lib/services/FinanceService";
import type { ContributionStatus } from "@/types";

export async function createContribution(_: unknown, formData: FormData) {
  const userId = formData.get("user_id") as string;
  const amountRaw = formData.get("amount") as string;
  const dueDate = formData.get("due_date") as string;
  const description = (formData.get("description") as string)?.trim() || null;

  const amount = parseFloat(amountRaw?.replace(/\./g, "").replace(",", "."));
  if (!userId || isNaN(amount) || amount <= 0 || !dueDate)
    return { error: "Usuario, monto y fecha son requeridos" };

  const ctx = await getCurrentContext();

  const { error } = await ctx.admin.from("house_contributions").insert({
    home_id: ctx.home.id,
    user_id: userId,
    amount,
    paid_amount: 0,
    status: resolveContributionStatus(amount, 0, dueDate) as ContributionStatus,
    due_date: dueDate,
    description,
  });

  if (error) return { error: error.message };

  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
  return { success: true };
}

export async function updateContributionPayment(id: string, paidAmount: number) {
  const ctx = await getCurrentContext();

  const { data: contrib } = await ctx.admin
    .from("house_contributions")
    .select("amount, due_date, user_id, home_id")
    .eq("id", id)
    .eq("home_id", ctx.home.id)
    .single();

  if (!contrib) return;

  await applyContributionPayment(ctx.admin, id, contrib, paidAmount);

  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
}

export async function deleteContribution(id: string) {
  const ctx = await getCurrentContext();
  await ctx.admin
    .from("house_contributions")
    .delete()
    .eq("id", id)
    .eq("home_id", ctx.home.id);
  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
}
