"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { hasPermission } from "@/lib/security/authorization";
import { Permission } from "@/lib/security/permissions";
import type { FinancialRecordType } from "@/types";

export async function createFinancialRecord(_: unknown, formData: FormData) {
  const type = formData.get("type") as FinancialRecordType;
  const amountRaw = formData.get("amount") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const date =
    (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  const amount = parseFloat(amountRaw?.replace(/\./g, "").replace(",", "."));
  if (!type || isNaN(amount) || amount <= 0)
    return { error: "Tipo y monto son requeridos" };

  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_FINANCES))
    return { error: "Sin permiso para registrar movimientos financieros" };

  const { error } = await ctx.admin.from("financial_records").insert({
    home_id: ctx.home.id,
    user_id: ctx.user.id,
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
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_FINANCES)) return;

  await ctx.admin
    .from("financial_records")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("home_id", ctx.home.id);

  revalidatePath("/finance");
  revalidatePath("/finance/records");
}

export async function deleteFinancialRecord(id: string) {
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_FINANCES)) return;

  await ctx.admin
    .from("financial_records")
    .delete()
    .eq("id", id)
    .eq("home_id", ctx.home.id);

  revalidatePath("/finance");
  revalidatePath("/finance/records");
}
