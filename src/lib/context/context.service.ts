import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { AppContext } from "./context.types";
import type { HomeMemberWithHome, HomeMemberWithRoleAndPermissions } from "@/types/database";
import { ROLE_PERMISSIONS } from "@/lib/security/permissions";

export type ServerContext = AppContext & { admin: AdminClient };

export async function getCurrentContext(): Promise<ServerContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Try the Phase 3 query (requires migration 012 to be applied)
  const { data: rawRow, error: roleQueryError } = await admin
    .from("home_members")
    .select(`
      id, home_id,
      homes(name, created_by),
      roles(id, name, role_permissions(permissions(key)))
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  // If the roles-related columns/tables don't exist yet (migration not applied),
  // fall back to the Phase 2 query so the app keeps working.
  if (roleQueryError) {
    return buildLegacyContext(admin, user);
  }

  if (!rawRow) redirect("/create-home");

  const row = rawRow as HomeMemberWithRoleAndPermissions;
  const homeInfo = row.homes;
  const roleInfo = row.roles;

  // If role_id is NULL (member existed before migration or backfill missed them),
  // fall back to creator-based permissions so the user isn't locked out.
  let permissions: string[];
  let role: { id: string; name: string } | null;

  if (roleInfo) {
    permissions = roleInfo.role_permissions
      .map((rp) => rp.permissions?.key)
      .filter((k): k is string => Boolean(k));
    role = { id: roleInfo.id, name: roleInfo.name };
  } else {
    const isCreator = homeInfo?.created_by === user.id;
    const roleName = isCreator ? "Owner" : "Member";
    permissions = (ROLE_PERMISSIONS[roleName] ?? []) as string[];
    role = { id: `legacy-${roleName.toLowerCase()}`, name: roleName };
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    home: { id: row.home_id, name: homeInfo?.name ?? "" },
    membership: { id: row.id, role },
    permissions,
    admin,
  };
}

// Fallback used when migration 012 hasn't been applied yet.
// Replicates Phase 2 behavior: admin derived from homes.created_by.
async function buildLegacyContext(
  admin: AdminClient,
  user: { id: string; email?: string },
): Promise<ServerContext> {
  const { data: rawRow } = await admin
    .from("home_members")
    .select("id, home_id, homes(name, created_by)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rawRow) redirect("/create-home");

  const row = rawRow as HomeMemberWithHome;
  const homeInfo = row.homes;
  const isCreator = homeInfo?.created_by === user.id;

  const roleName = isCreator ? "Owner" : "Member";
  const permissions = (ROLE_PERMISSIONS[roleName] ?? []) as string[];

  return {
    user: { id: user.id, email: user.email ?? "" },
    home: { id: row.home_id, name: homeInfo?.name ?? "" },
    membership: {
      id: row.id,
      role: { id: `legacy-${roleName.toLowerCase()}`, name: roleName },
    },
    permissions,
    admin,
  };
}
