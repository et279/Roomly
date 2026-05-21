import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/context/context";
import { canManageRoles } from "@/lib/security/authorization";
import RolesPanel from "./_components/RolesPanel";

type MemberRow = {
  id: string;
  user_id: string;
  name: string;
  currentRoleId: string | null;
  currentRoleName: string | null;
  isSelf: boolean;
};

export default async function RolesPage() {
  const ctx = await getCurrentContext();

  if (!canManageRoles(ctx)) redirect("/");

  // Fetch members and roles in parallel; profiles fetched separately to avoid
  // PostgREST join ambiguity when two FK joins are combined in one select.
  const [{ data: memberRows, error: memberError }, { data: allRoles, error: rolesError }] = await Promise.all([
    ctx.admin
      .from("home_members")
      .select("id, user_id, role_id, roles(id, name)")
      .eq("home_id", ctx.home.id),
    ctx.admin
      .from("roles")
      .select("id, name, description, role_permissions(permissions(key))")
      .order("name"),
  ]);

  // Separate profiles query — avoids combining two PostgREST joins in one call
  const userIds = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profileRows } = userIds.length > 0
    ? await ctx.admin.from("profiles").select("id, name").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profileRows ?? []).map((p) => [p.id as string, p.name as string]));

  const migrationPending = Boolean(memberError);

  let members: MemberRow[];
  if (memberError) {
    // role_id column missing (migration not applied) — show members without role info
    const { data: fallbackRows } = await ctx.admin
      .from("home_members")
      .select("id, user_id")
      .eq("home_id", ctx.home.id);
    members = (fallbackRows ?? []).map((m) => ({
      id: m.id as string,
      user_id: m.user_id as string,
      name: profileMap.get(m.user_id as string) ?? "Sin nombre",
      currentRoleId: null,
      currentRoleName: null,
      isSelf: (m.user_id as string) === ctx.user.id,
    }));
  } else {
    members = (memberRows ?? []).map((m) => {
      const roleData = m.roles as unknown as { id: string; name: string } | null;
      return {
        id: m.id as string,
        user_id: m.user_id as string,
        name: profileMap.get(m.user_id as string) ?? "Sin nombre",
        currentRoleId: roleData?.id ?? null,
        currentRoleName: roleData?.name ?? null,
        isSelf: (m.user_id as string) === ctx.user.id,
      };
    });
  }

  const roles = rolesError ? [] : (allRoles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: (r.role_permissions as Array<{ permissions: { key: string } | null }>)
      .map((rp) => rp.permissions?.key)
      .filter((k): k is string => Boolean(k)),
  }));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-6">
        <header className="space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            {ctx.home.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Roles y permisos</h1>
          <p className="text-sm text-muted-foreground">
            Asigná roles a los miembros para controlar qué pueden hacer en el hogar.
          </p>
        </header>

        <RolesPanel members={members} roles={roles} migrationPending={migrationPending} />
      </div>
    </main>
  );
}
