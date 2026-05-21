import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function verifyTaskOwnership(
  admin: AdminClient,
  taskId: string,
  homeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("tasks")
    .select("home_id")
    .eq("id", taskId)
    .single();
  return data?.home_id === homeId;
}

export async function verifyShoppingOwnership(
  admin: AdminClient,
  itemId: string,
  homeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("shopping_items")
    .select("home_id")
    .eq("id", itemId)
    .single();
  return data?.home_id === homeId;
}

export async function verifyFinancialOwnership(
  admin: AdminClient,
  recordId: string,
  homeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("financial_records")
    .select("home_id")
    .eq("id", recordId)
    .single();
  return data?.home_id === homeId;
}

export async function verifyContributionOwnership(
  admin: AdminClient,
  contributionId: string,
  homeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("house_contributions")
    .select("home_id")
    .eq("id", contributionId)
    .single();
  return data?.home_id === homeId;
}

export async function verifySavingOwnership(
  admin: AdminClient,
  goalId: string,
  homeId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("saving_goals")
    .select("home_id")
    .eq("id", goalId)
    .single();
  return data?.home_id === homeId;
}
