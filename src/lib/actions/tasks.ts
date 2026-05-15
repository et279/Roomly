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

export async function createTask(_: unknown, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const assignedTo = formData.get("assigned_to") as string | null;

  if (!title) return { error: "El título no puede estar vacío" };

  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return { error: "No pertenecés a ningún hogar" };

  const { error } = await admin.from("tasks").insert({
    home_id: homeId,
    title,
    assigned_to: assignedTo || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTask(id: string, done: boolean) {
  const { admin } = await getUserAndHome();
  await admin.from("tasks").update({ done }).eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const { admin } = await getUserAndHome();
  await admin.from("tasks").delete().eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
}
