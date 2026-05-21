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

export async function createSavingGoal(_: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const targetRaw = formData.get("target_amount") as string;
  const deadline = (formData.get("deadline") as string) || null;

  const targetAmount = parseFloat(targetRaw?.replace(/\./g, "").replace(",", "."));
  if (!name || isNaN(targetAmount) || targetAmount <= 0)
    return { error: "Nombre y monto objetivo son requeridos" };

  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("saving_goals").insert({
    home_id: homeId,
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
  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return;

  // home_id filter verifies ownership and prevents exceeding target (KI-013)
  const { data: goal } = await admin
    .from("saving_goals")
    .select("current_amount, target_amount")
    .eq("id", id)
    .eq("home_id", homeId)
    .single();

  if (!goal) return;

  // Cap at target_amount to prevent inconsistent data (fixes KI-013)
  const newAmount = Math.min(
    Number(goal.current_amount) + additionalAmount,
    Number(goal.target_amount),
  );

  await admin
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
  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return;

  await admin
    .from("saving_goals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("home_id", homeId);

  revalidatePath("/finance");
  revalidatePath("/finance/savings");
}

export async function deleteSavingGoal(id: string) {
  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return;
  await admin.from("saving_goals").delete().eq("id", id).eq("home_id", homeId);
  revalidatePath("/finance");
  revalidatePath("/finance/savings");
}
