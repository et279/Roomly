"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createHome(_: unknown, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name || name.trim().length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: home, error } = await admin
    .from("homes")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error || !home) {
    return { error: error?.message ?? "Error al crear el hogar" };
  }

  await admin.from("home_members").insert({
    home_id: home.id,
    user_id: user.id,
  });

  redirect("/invite");
}

export async function inviteMember(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Email inválido" };
  }

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

  if (!membership) return { error: "No pertenecés a ningún hogar" };

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingProfile) {
    const { error } = await admin.from("home_members").insert({
      home_id: membership.home_id,
      user_id: existingProfile.id,
    });
    if (error) return { error: "Esa persona ya está en el hogar" };
    return { success: true, email };
  }

  const { error } = await admin.from("invitations").insert({
    home_id: membership.home_id,
    email,
    invited_by: user.id,
  });

  if (error) return { error: "Error al enviar la invitación" };

  return { success: true, email };
}

export async function getCurrentHome(userId: string) {
  const admin = createAdminClient();

  const { data } = await admin
    .from("home_members")
    .select("homes(id, name, created_by, created_at)")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return (
    (data.homes as unknown as {
      id: string;
      name: string;
      created_by: string;
      created_at: string;
    }) ?? null
  );
}
