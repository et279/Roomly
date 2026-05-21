"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { hasPermission } from "@/lib/security/authorization";
import { Permission } from "@/lib/security/permissions";
import { toggleShoppingItem as performToggle } from "@/lib/services/ShoppingService";

export async function createShoppingItem(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const quantity = (formData.get("quantity") as string)?.trim() || null;

  if (!title) return { error: "El nombre no puede estar vacío" };

  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.CREATE_SHOPPING))
    return { error: "Sin permiso para agregar ítems" };

  const { error } = await ctx.admin.from("shopping_items").insert({
    home_id: ctx.home.id,
    title,
    quantity,
    added_by: ctx.user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/shopping");
  revalidatePath("/");
  return { error: null };
}

export async function toggleShoppingItem(id: string, done: boolean) {
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_SHOPPING)) return;

  const { data: item } = await ctx.admin
    .from("shopping_items")
    .select("home_id")
    .eq("id", id)
    .eq("home_id", ctx.home.id)
    .single();

  if (!item) return;

  await performToggle(ctx.admin, id, done, ctx.user.id, item.home_id);

  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function deleteShoppingItem(id: string) {
  const ctx = await getCurrentContext();
  if (!hasPermission(ctx, Permission.EDIT_SHOPPING)) return;

  await ctx.admin
    .from("shopping_items")
    .delete()
    .eq("id", id)
    .eq("home_id", ctx.home.id);
  revalidatePath("/shopping");
  revalidatePath("/");
}
