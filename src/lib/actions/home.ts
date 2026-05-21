"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHome } from "@/lib/services/HomeService";

export { getCurrentHome };

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

  const { data: existingMembers } = await admin
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingMembers && existingMembers.length > 0) redirect("/");

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

export async function createInviteLink(_: unknown, _formData: FormData) {
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

  const token = crypto.randomUUID();

  const { error } = await admin.from("invite_links").insert({
    home_id: membership.home_id,
    created_by: user.id,
    token,
  });

  if (error) return { error: "Error al generar el enlace" };

  return { success: true, token };
}

export async function removeMember(memberUserId: string) {
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

  const { data: home } = await admin
    .from("homes")
    .select("created_by")
    .eq("id", membership.home_id)
    .single();

  if (!home || home.created_by !== user.id) {
    return { error: "Solo el administrador puede eliminar miembros" };
  }

  if (memberUserId === user.id) {
    return { error: "No podés eliminarte a vos mismo" };
  }

  const { error } = await admin
    .from("home_members")
    .delete()
    .eq("home_id", membership.home_id)
    .eq("user_id", memberUserId);

  if (error) return { error: "Error al eliminar el miembro" };

  revalidatePath("/");
  return { success: true };
}
