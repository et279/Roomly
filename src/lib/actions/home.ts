"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentContext } from "@/lib/context/context";
import { canManageMembers, canManageInvites } from "@/lib/security/authorization";
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

  // Assign Owner role to the home creator
  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("name", "Owner")
    .single();

  await admin.from("home_members").insert({
    home_id: home.id,
    user_id: user.id,
    role_id: ownerRole?.id ?? null,
  });

  redirect("/invite");
}

export async function inviteMember(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Email inválido" };
  }

  const ctx = await getCurrentContext();
  if (!canManageInvites(ctx)) return { error: "Sin permiso para invitar miembros" };

  const { data: existingProfile } = await ctx.admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existingProfile) {
    const { data: memberRole } = await ctx.admin
      .from("roles")
      .select("id")
      .eq("name", "Member")
      .single();

    const { error } = await ctx.admin.from("home_members").insert({
      home_id: ctx.home.id,
      user_id: existingProfile.id,
      role_id: memberRole?.id ?? null,
    });
    if (error) return { error: "Esa persona ya está en el hogar" };
    return { success: true, email };
  }

  const { error } = await ctx.admin.from("invitations").insert({
    home_id: ctx.home.id,
    email,
    invited_by: ctx.user.id,
  });

  if (error) return { error: "Error al enviar la invitación" };

  return { success: true, email };
}

export async function createInviteLink(_: unknown, _formData: FormData) {
  const ctx = await getCurrentContext();
  if (!canManageInvites(ctx)) return { error: "Sin permiso para crear invitaciones" };

  const token = crypto.randomUUID();

  const { error } = await ctx.admin.from("invite_links").insert({
    home_id: ctx.home.id,
    created_by: ctx.user.id,
    token,
  });

  if (error) return { error: "Error al generar el enlace" };

  return { success: true, token };
}

export async function removeMember(memberUserId: string) {
  const ctx = await getCurrentContext();
  if (!canManageMembers(ctx))
    return { error: "Solo el administrador puede eliminar miembros" };

  if (memberUserId === ctx.user.id) {
    return { error: "No podés eliminarte a vos mismo" };
  }

  const { error } = await ctx.admin
    .from("home_members")
    .delete()
    .eq("home_id", ctx.home.id)
    .eq("user_id", memberUserId);

  if (error) return { error: "Error al eliminar el miembro" };

  revalidatePath("/");
  return { success: true };
}
