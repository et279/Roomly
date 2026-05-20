"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FinancialRecordType } from "@/types";

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

export async function createFinancialRecord(_: unknown, formData: FormData) {
  const type = formData.get("type") as FinancialRecordType;
  const amountRaw = formData.get("amount") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  const amount = parseFloat(amountRaw?.replace(/\./g, "").replace(",", "."));
  if (!type || isNaN(amount) || amount <= 0)
    return { error: "Tipo y monto son requeridos" };

  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("financial_records").insert({
    home_id: homeId,
    user_id: user.id,
    type,
    amount,
    category_id: categoryId || null,
    description,
    date,
  });

  if (error) return { error: error.message };

  revalidatePath("/finance");
  revalidatePath("/finance/records");
  return { success: true };
}

export async function updateFinancialRecord(
  id: string,
  updates: {
    type?: FinancialRecordType;
    amount?: number;
    category_id?: string | null;
    description?: string | null;
    date?: string;
  },
) {
  const { admin } = await getUserAndHome();
  await admin
    .from("financial_records")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/finance");
  revalidatePath("/finance/records");
}

export async function deleteFinancialRecord(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("financial_records").delete().eq("id", id);
  revalidatePath("/finance");
  revalidatePath("/finance/records");
}
