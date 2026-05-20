import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ShoppingList from "./_components/ShoppingList";
import type { ShoppingItemWithAdder } from "@/types";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: membershipRows } = await admin
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .limit(1);

  const membership = membershipRows?.[0] ?? null;
  if (!membership) redirect("/create-home");

  const { data: memberRows } = await admin
    .from("home_members")
    .select("user_id")
    .eq("home_id", membership.home_id);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  const [{ data: items }, { data: memberProfiles }] = await Promise.all([
    admin
      .from("shopping_items")
      .select("id, home_id, title, quantity, added_by, done, created_at")
      .eq("home_id", membership.home_id)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id, name").in("id", memberIds),
  ]);

  const itemsWithAdder = (items ?? []).map((item) => ({
    ...item,
    profiles: item.added_by
      ? ((memberProfiles ?? []).find((p) => p.id === item.added_by) ?? null)
      : null,
  }));

  return (
    <ShoppingList
      items={itemsWithAdder as unknown as ShoppingItemWithAdder[]}
      currentUserId={user.id}
    />
  );
}
