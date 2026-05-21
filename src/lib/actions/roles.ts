"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { canManageRoles } from "@/lib/security/authorization";

export async function assignRole(memberUserId: string, roleId: string) {
  const ctx = await getCurrentContext();
  if (!canManageRoles(ctx))
    return { error: "Sin permiso para asignar roles" };

  if (memberUserId === ctx.user.id)
    return { error: "No podés cambiar tu propio rol" };

  const { error } = await ctx.admin
    .from("home_members")
    .update({ role_id: roleId })
    .eq("home_id", ctx.home.id)
    .eq("user_id", memberUserId);

  if (error) return { error: "Error al asignar el rol" };

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function getRolesWithPermissions() {
  const { admin } = await getCurrentContext();

  const { data: roles } = await admin
    .from("roles")
    .select("id, name, description, role_permissions(permissions(key))")
    .order("name");

  return roles ?? [];
}
