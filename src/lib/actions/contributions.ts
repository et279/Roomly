"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContributionStatus } from "@/types";

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

function resolveStatus(amount: number, paidAmount: number, dueDate: string): ContributionStatus {
  if (paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partial";
  if (new Date(dueDate) < new Date()) return "overdue";
  return "pending";
}

export async function createContribution(_: unknown, formData: FormData) {
  const userId = formData.get("user_id") as string;
  const amountRaw = formData.get("amount") as string;
  const dueDate = formData.get("due_date") as string;
  const description = (formData.get("description") as string)?.trim() || null;

  const amount = parseFloat(amountRaw?.replace(/\./g, "").replace(",", "."));
  if (!userId || isNaN(amount) || amount <= 0 || !dueDate)
    return { error: "Usuario, monto y fecha son requeridos" };

  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("house_contributions").insert({
    home_id: homeId,
    user_id: userId,
    amount,
    paid_amount: 0,
    status: resolveStatus(amount, 0, dueDate),
    due_date: dueDate,
    description,
  });

  if (error) return { error: error.message };

  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
  return { success: true };
}

export async function updateContributionPayment(id: string, paidAmount: number) {
  const { admin } = await getUserAndHome();

  const { data: contrib } = await admin
    .from("house_contributions")
    .select("amount, due_date")
    .eq("id", id)
    .single();

  if (!contrib) return;

  const status = resolveStatus(contrib.amount, paidAmount, contrib.due_date);

  await admin
    .from("house_contributions")
    .update({ paid_amount: paidAmount, status, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
}

export async function deleteContribution(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("house_contributions").delete().eq("id", id);
  revalidatePath("/finance");
  revalidatePath("/finance/contributions");
}
