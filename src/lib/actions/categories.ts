"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_CATEGORIES = [
  { name: "Hogar", icon: "home", color: "#6366f1" },
  { name: "Alimentación", icon: "utensils", color: "#f59e0b" },
  { name: "Servicios", icon: "zap", color: "#3b82f6" },
  { name: "Transporte", icon: "car", color: "#8b5cf6" },
  { name: "Entretenimiento", icon: "tv", color: "#ec4899" },
  { name: "Salud", icon: "heart", color: "#ef4444" },
  { name: "Mascotas", icon: "paw-print", color: "#f97316" },
  { name: "Otros", icon: "circle", color: "#94a3b8" },
];

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

export async function seedDefaultCategories(homeId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("expense_categories")
    .select("id", { count: "exact", head: true })
    .eq("home_id", homeId);

  if ((count ?? 0) > 0) return;

  await admin.from("expense_categories").insert(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, home_id: homeId })),
  );
}

export async function createCategory(_: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const icon = (formData.get("icon") as string) || "circle";
  const color = (formData.get("color") as string) || "#94a3b8";

  if (!name) return { error: "El nombre no puede estar vacío" };

  const { homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("expense_categories").insert({
    home_id: homeId,
    name,
    icon,
    color,
  });

  if (error) return { error: error.message };

  revalidatePath("/finance/categories");
  revalidatePath("/finance");
  return { success: true };
}

export async function updateCategory(
  id: string,
  updates: { name?: string; icon?: string; color?: string },
) {
  const { admin } = await getUserAndHome();
  await admin.from("expense_categories").update(updates).eq("id", id);
  revalidatePath("/finance/categories");
  revalidatePath("/finance");
}

export async function deleteCategory(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("expense_categories").delete().eq("id", id);
  revalidatePath("/finance/categories");
  revalidatePath("/finance");
}
