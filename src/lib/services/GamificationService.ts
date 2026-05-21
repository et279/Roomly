import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import type { PeriodType } from "@/types";

function getPeriodDates(type: PeriodType): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (type === "monthly") {
    return {
      start: new Date(year, month, 1).toISOString().split("T")[0],
      end: new Date(year, month + 1, 0).toISOString().split("T")[0],
    };
  }

  if (day <= 15) {
    return {
      start: new Date(year, month, 1).toISOString().split("T")[0],
      end: new Date(year, month, 15).toISOString().split("T")[0],
    };
  }
  return {
    start: new Date(year, month, 16).toISOString().split("T")[0],
    end: new Date(year, month + 1, 0).toISOString().split("T")[0],
  };
}

async function getOrCreateActivePeriod(admin: AdminClient, homeId: string) {
  const { data: settings } = await admin
    .from("home_gamification_settings")
    .select("enabled, period_type")
    .eq("home_id", homeId)
    .single();

  if (!settings?.enabled) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: active } = await admin
    .from("ranking_periods")
    .select("id, start_date, end_date, period_type")
    .eq("home_id", homeId)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (active) return active;

  const periodType = (settings.period_type ?? "monthly") as PeriodType;
  const dates = getPeriodDates(periodType);

  const { data: home } = await admin
    .from("homes")
    .select("created_by")
    .eq("id", homeId)
    .single();

  const { data: newPeriod } = await admin
    .from("ranking_periods")
    .insert({
      home_id: homeId,
      period_type: periodType,
      start_date: dates.start,
      end_date: dates.end,
      status: "active",
      created_by: home!.created_by,
    })
    .select("id, start_date, end_date, period_type")
    .single();

  return newPeriod;
}

async function upsertPeriodScore(
  admin: AdminClient,
  periodId: string,
  homeId: string,
  userId: string,
  increment: {
    tasks_points?: number;
    shopping_points?: number;
    finance_points?: number;
    achievement_points?: number;
  },
) {
  const { error } = await admin.rpc("increment_period_score", {
    p_period_id: periodId,
    p_home_id: homeId,
    p_user_id: userId,
    p_tasks_points: increment.tasks_points ?? 0,
    p_shopping_points: increment.shopping_points ?? 0,
    p_finance_points: increment.finance_points ?? 0,
    p_achievement_points: increment.achievement_points ?? 0,
  });

  if (error) {
    logger.error("gamification", "upsertPeriodScore RPC failed", {
      userId,
      homeId,
      error,
    });
  }
}

async function checkAndAwardAchievements(
  admin: AdminClient,
  userId: string,
  homeId: string,
  periodId: string | null,
) {
  const { data: allAchievements } = await admin
    .from("achievements")
    .select("id, key, name, description, icon, category, points, condition_type, condition_value");

  if (!allAchievements?.length) return;

  const { data: earned } = await admin
    .from("member_achievements")
    .select("achievement_id")
    .eq("home_id", homeId)
    .eq("user_id", userId);

  const earnedIds = new Set((earned ?? []).map((e) => e.achievement_id));

  const [
    { count: tasksCompleted },
    { count: shoppingDone },
    { count: contributionsPaid },
    { count: periodsWon },
  ] = await Promise.all([
    admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("shopping_items")
      .select("id", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("house_contributions")
      .select("id", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("user_id", userId)
      .eq("status", "paid"),
    admin
      .from("period_scores")
      .select("id", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("user_id", userId)
      .eq("final_rank", 1),
  ]);

  const counters: Record<string, number> = {
    tasks_completed: tasksCompleted ?? 0,
    shopping_done: shoppingDone ?? 0,
    contributions_paid: contributionsPaid ?? 0,
    periods_won: periodsWon ?? 0,
  };

  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue;
    if ((counters[achievement.condition_type] ?? 0) < achievement.condition_value) continue;

    await admin.from("member_achievements").insert({
      home_id: homeId,
      user_id: userId,
      achievement_id: achievement.id,
    });

    if (periodId) {
      await upsertPeriodScore(admin, periodId, homeId, userId, {
        achievement_points: achievement.points,
      });
    }
  }
}

export async function awardTaskPoints(
  userId: string,
  homeId: string,
  dueDate: string | null,
  completedAt: string,
) {
  const admin = createAdminClient();
  const period = await getOrCreateActivePeriod(admin, homeId);
  if (!period) return;

  let points = 10;
  if (dueDate) {
    const due = new Date(dueDate + "T23:59:59");
    if (new Date(completedAt) <= due) points += 5;
  }

  await upsertPeriodScore(admin, period.id, homeId, userId, { tasks_points: points });
  await checkAndAwardAchievements(admin, userId, homeId, period.id);
}

export async function awardShoppingPoints(userId: string, homeId: string) {
  const admin = createAdminClient();
  const period = await getOrCreateActivePeriod(admin, homeId);
  if (!period) return;

  await upsertPeriodScore(admin, period.id, homeId, userId, { shopping_points: 3 });
  await checkAndAwardAchievements(admin, userId, homeId, period.id);
}

export async function awardFinancePoints(userId: string, homeId: string) {
  const admin = createAdminClient();
  const period = await getOrCreateActivePeriod(admin, homeId);
  if (!period) return;

  await upsertPeriodScore(admin, period.id, homeId, userId, { finance_points: 25 });
  await checkAndAwardAchievements(admin, userId, homeId, period.id);
}

export { checkAndAwardAchievements, upsertPeriodScore, getOrCreateActivePeriod };
