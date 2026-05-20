import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDefaultCategories } from "@/lib/actions/categories";
import CategoriesList from "./_components/CategoriesList";
import type { ExpenseCategory } from "@/types";

export default async function CategoriesPage() {
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

  await seedDefaultCategories(homeId);

  const { data: categories } = await admin
    .from("expense_categories")
    .select("*")
    .eq("home_id", homeId)
    .order("name");

  return <CategoriesList categories={(categories ?? []) as ExpenseCategory[]} />;
}
