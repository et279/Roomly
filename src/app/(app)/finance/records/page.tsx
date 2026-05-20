import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import RecordsList from "./_components/RecordsList";
import type { ExpenseCategory, FinancialRecordWithDetails } from "@/types";

export default async function RecordsPage() {
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

  const [{ data: records }, { data: categories }] = await Promise.all([
    admin
      .from("financial_records")
      .select("*, profiles(name), expense_categories(name, icon, color)")
      .eq("home_id", homeId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("expense_categories")
      .select("*")
      .eq("home_id", homeId)
      .order("name"),
  ]);

  return (
    <RecordsList
      records={(records ?? []) as FinancialRecordWithDetails[]}
      categories={(categories ?? []) as ExpenseCategory[]}
      currentUserId={user.id}
    />
  );
}
