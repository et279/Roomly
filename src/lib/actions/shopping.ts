"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardShoppingPoints } from "@/lib/actions/gamification";

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

export async function createShoppingItem(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const quantity = (formData.get("quantity") as string)?.trim() || null;

  if (!title) return { error: "El nombre no puede estar vacío" };

  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("shopping_items").insert({
    home_id: homeId,
    title,
    quantity,
    added_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/shopping");
  revalidatePath("/");
  return { error: null };
}

export async function toggleShoppingItem(id: string, done: boolean) {
  const { user, admin } = await getUserAndHome();

  await admin
    .from("shopping_items")
    .update({ done, completed_by: done ? user.id : null })
    .eq("id", id);

  if (done) {
    const { data: item } = await admin
      .from("shopping_items")
      .select("home_id")
      .eq("id", id)
      .single();

    if (item) {
      awardShoppingPoints(user.id, item.home_id).catch(() => {});
    }
  }

  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function deleteShoppingItem(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("shopping_items").delete().eq("id", id);
  revalidatePath("/shopping");
  revalidatePath("/");
}
