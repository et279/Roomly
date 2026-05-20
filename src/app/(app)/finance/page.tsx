import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedDefaultCategories } from "@/lib/actions/categories";
import FinanceDashboard from "./_components/FinanceDashboard";
import type {
  ExpenseCategory,
  FinancialRecordWithDetails,
  HouseContributionWithProfile,
  SavingGoal,
  FinanceMetrics,
} from "@/types";

export default async function FinancePage() {
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

  // Seed categorías por defecto si el hogar no tiene ninguna
  await seedDefaultCategories(homeId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [
    { data: recordsRaw },
    { data: contributions },
    { data: savingGoals },
    { data: categories },
  ] = await Promise.all([
    admin
      .from("financial_records")
      .select("*, profiles(name), expense_categories(name, icon, color)")
      .eq("home_id", homeId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false }),
    admin
      .from("house_contributions")
      .select("*, profiles(name)")
      .eq("home_id", homeId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .order("due_date", { ascending: true }),
    admin
      .from("saving_goals")
      .select("*")
      .eq("home_id", homeId)
      .order("created_at", { ascending: false }),
    admin
      .from("expense_categories")
      .select("*")
      .eq("home_id", homeId)
      .order("name"),
  ]);

  const records = (recordsRaw ?? []) as FinancialRecordWithDetails[];

  const monthlyIncome = records
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const monthlyExpenses = records
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const monthlySavings = records
    .filter((r) => r.type === "saving")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // Gastos agrupados por categoría
  const expenseRecords = records.filter((r) => r.type === "expense");
  const categoryTotals = new Map<string | null, number>();
  for (const r of expenseRecords) {
    const key = r.category_id;
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + Number(r.amount));
  }

  const expensesByCategory = Array.from(categoryTotals.entries())
    .map(([catId, total]) => ({
      category: (categories ?? []).find((c) => c.id === catId) ?? null,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const topCategory = expensesByCategory[0]
    ? {
        name: expensesByCategory[0].category?.name ?? "Sin categoría",
        icon: expensesByCategory[0].category?.icon ?? "circle",
        color: expensesByCategory[0].category?.color ?? "#94a3b8",
        total: expensesByCategory[0].total,
      }
    : null;

  const metrics: FinanceMetrics = {
    monthlyIncome,
    monthlyExpenses,
    monthlyBalance: monthlyIncome - monthlyExpenses,
    monthlySavings,
    topCategory,
    expensesByCategory,
  };

  return (
    <FinanceDashboard
      metrics={metrics}
      recentRecords={records.slice(0, 5)}
      contributions={(contributions ?? []) as HouseContributionWithProfile[]}
      savingGoals={(savingGoals ?? []) as SavingGoal[]}
      categories={(categories ?? []) as ExpenseCategory[]}
      currentUserId={user.id}
    />
  );
}
