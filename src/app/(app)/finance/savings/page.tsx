import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SavingsList from "./_components/SavingsList";
import type { SavingGoal } from "@/types";

export default async function SavingsPage() {
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

  const homeId = membershipRows?.[0]?.home_id;
  if (!homeId) redirect("/create-home");

  const { data: goals } = await admin
    .from("saving_goals")
    .select("*")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });

  return (
    <SavingsList
      goals={(goals ?? []) as SavingGoal[]}
      currentUserId={user.id}
    />
  );
}
