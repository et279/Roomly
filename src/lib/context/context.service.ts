import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { AppContext } from "./context.types";
import type { HomeMemberWithHome } from "@/types/database";

export type ServerContext = AppContext & { admin: AdminClient };

export async function getCurrentContext(): Promise<ServerContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: rawRow } = await admin
    .from("home_members")
    .select("id, home_id, homes(name, created_by)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!rawRow) redirect("/create-home");

  const row = rawRow as HomeMemberWithHome;
  const homeInfo = row.homes;
  const isAdmin = homeInfo?.created_by === user.id;

  return {
    user: { id: user.id, email: user.email ?? "" },
    home: { id: row.home_id, name: homeInfo?.name ?? "" },
    membership: { id: row.id, role: isAdmin ? "admin" : null },
    permissions: isAdmin ? ["admin", "member"] : ["member"],
    admin,
  };
}
