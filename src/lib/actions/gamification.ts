"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import type { PeriodType, AchievementWithStatus, ActivityCounters } from "@/types";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

function getPeriodDates(type: PeriodType): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (type === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }

  // biweekly: 1–15 or 16–end of month
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

type AdminClient = ReturnType<typeof createAdminClient>;

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

  // Auto-create new period
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

// Uses RPC increment_period_score (migration 010) for atomic increments — no race condition
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
  const { data: allAchievements } = await admin.from("achievements").select("*");
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
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("shopping_items")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("house_contributions")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("user_id", userId)
      .eq("status", "paid"),
    admin
      .from("period_scores")
      .select("*", { count: "exact", head: true })
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

// ── Public helpers called from other actions ─────────────────────────────────

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

// ── Admin actions ─────────────────────────────────────────────────────────────

async function requireAdmin(admin: AdminClient, userId: string) {
  const { data: membership } = await admin
    .from("home_members")
    .select("home_id, homes(created_by)")
    .eq("user_id", userId)
    .single();

  const homeData = membership as unknown as {
    home_id: string;
    homes: { created_by: string };
  } | null;

  if (!homeData) return { error: "No pertenecés a ningún hogar" } as const;
  if (homeData.homes.created_by !== userId)
    return { error: "Solo el admin puede configurar el ranking" } as const;

  return { homeId: homeData.home_id } as const;
}

export async function configureGamification(_: unknown, formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();
  const result = await requireAdmin(admin, user.id);
  if ("error" in result) return result;

  const enabled = formData.get("enabled") === "true";
  const periodType = (formData.get("period_type") as PeriodType) ?? "monthly";

  await admin.from("home_gamification_settings").upsert(
    {
      home_id: result.homeId,
      enabled,
      period_type: periodType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "home_id" },
  );

  revalidatePath("/ranking");
  return { success: true };
}

export async function savePrizes(_: unknown, formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();
  const result = await requireAdmin(admin, user.id);
  if ("error" in result) return result;

  const today = new Date().toISOString().split("T")[0];
  const { data: period } = await admin
    .from("ranking_periods")
    .select("id")
    .eq("home_id", result.homeId)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (!period) return { error: "No hay período activo aún" };

  await admin.from("ranking_prizes").delete().eq("period_id", period.id);

  const prizes = [1, 2, 3]
    .map((rank) => ({
      period_id: period.id,
      rank,
      prize_description: ((formData.get(`prize_${rank}`) as string) ?? "").trim(),
    }))
    .filter((p) => p.prize_description.length > 0);

  if (prizes.length > 0) {
    await admin.from("ranking_prizes").insert(prizes);
  }

  revalidatePath("/ranking");
  return { success: true };
}

// Uses close_period_atomic RPC (migration 010) — rank assignment + period close in one transaction
export async function closePeriod(periodId: string) {
  const user = await getUser();
  const admin = createAdminClient();

  const { data: result, error } = await admin.rpc("close_period_atomic", {
    p_period_id: periodId,
    p_requesting_user_id: user.id,
  });

  if (error) {
    logger.error("gamification", "close_period_atomic RPC failed", {
      userId: user.id,
      error,
    });
    return { error: "Error al cerrar el período" };
  }

  const rpcResult = result as { error?: string; success?: boolean; winner_id?: string; home_id?: string } | null;

  if (rpcResult?.error) return { error: rpcResult.error };

  // Award achievements to winner (done outside the transaction — idempotent)
  if (rpcResult?.winner_id && rpcResult?.home_id) {
    await checkAndAwardAchievements(
      admin,
      rpcResult.winner_id,
      rpcResult.home_id,
      null,
    );
  }

  revalidatePath("/ranking");
  return { success: true };
}

export async function savePollOptions(_: unknown, formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();
  const result = await requireAdmin(admin, user.id);
  if ("error" in result) return result;

  const today = new Date().toISOString().split("T")[0];
  const { data: period } = await admin
    .from("ranking_periods")
    .select("id")
    .eq("home_id", result.homeId)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (!period) return { error: "No hay período activo aún" };

  const options = [1, 2, 3, 4]
    .map((i) => ((formData.get(`option_${i}`) as string) ?? "").trim())
    .filter((t) => t.length > 0)
    .map((option_text) => ({
      period_id: period.id,
      home_id: result.homeId,
      option_text,
      created_by: user.id,
    }));

  if (options.length < 2) return { error: "Necesitás al menos 2 opciones" };

  // Delete old options (votes cascade)
  await admin.from("prize_poll_options").delete().eq("period_id", period.id);
  await admin.from("prize_poll_options").insert(options);

  revalidatePath("/ranking");
  return { success: true };
}

export async function votePollOption(optionId: string) {
  const user = await getUser();
  const admin = createAdminClient();

  const { data: option } = await admin
    .from("prize_poll_options")
    .select("period_id, home_id")
    .eq("id", optionId)
    .single();

  if (!option) return { error: "Opción no válida" };

  const { data: membership } = await admin
    .from("home_members")
    .select("id")
    .eq("home_id", option.home_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "No pertenecés a este hogar" };

  await admin.from("prize_poll_votes").upsert(
    {
      option_id: optionId,
      period_id: option.period_id,
      user_id: user.id,
      home_id: option.home_id,
    },
    { onConflict: "period_id,user_id" },
  );

  revalidatePath("/ranking");
  return { success: true };
}

// ── Data fetching ────────────────────────────────────────────────────────────

export async function getRankingData(homeId: string, userId?: string) {
  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: settings }, { data: activePeriod }, { data: pastPeriods }] =
    await Promise.all([
      admin
        .from("home_gamification_settings")
        .select("id, home_id, enabled, period_type")
        .eq("home_id", homeId)
        .maybeSingle(),
      admin
        .from("ranking_periods")
        .select("id, period_type, start_date, end_date, status")
        .eq("home_id", homeId)
        .eq("status", "active")
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle(),
      admin
        .from("ranking_periods")
        .select("id, period_type, start_date, end_date, status")
        .eq("home_id", homeId)
        .eq("status", "closed")
        .order("end_date", { ascending: false })
        .limit(5),
    ]);

  let scores = null;
  let prizes = null;
  let pollOptions: { id: string; option_text: string; vote_count: number }[] = [];
  let myVote: string | null = null;

  if (activePeriod) {
    const [{ data: scoresData }, { data: prizesData }, { data: pollOpts }, { data: myVoteRow }, { data: allVotes }] =
      await Promise.all([
        admin
          .from("period_scores")
          .select(
            "user_id, tasks_points, shopping_points, finance_points, achievement_points, total_points, profiles(name)",
          )
          .eq("period_id", activePeriod.id)
          .order("total_points", { ascending: false }),
        admin
          .from("ranking_prizes")
          .select("rank, prize_description")
          .eq("period_id", activePeriod.id)
          .order("rank"),
        admin
          .from("prize_poll_options")
          .select("id, option_text")
          .eq("period_id", activePeriod.id)
          .order("created_at"),
        userId
          ? admin
              .from("prize_poll_votes")
              .select("option_id")
              .eq("period_id", activePeriod.id)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Single query for all votes — replaces N+1 pattern (fixes KI-014)
        admin
          .from("prize_poll_votes")
          .select("option_id")
          .eq("period_id", activePeriod.id),
      ]);

    scores = scoresData;
    prizes = prizesData;
    myVote = (myVoteRow as { option_id: string } | null)?.option_id ?? null;

    if (pollOpts?.length) {
      // Count votes in JS from the single fetched set
      const voteMap = new Map<string, number>();
      (allVotes ?? []).forEach((v) => {
        voteMap.set(v.option_id, (voteMap.get(v.option_id) ?? 0) + 1);
      });

      pollOptions = pollOpts.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text,
        vote_count: voteMap.get(opt.id) ?? 0,
      }));
    }
  }

  // Past periods scores (for history)
  let pastScores: Record<string, unknown[]> = {};
  if (pastPeriods?.length) {
    const results = await Promise.all(
      pastPeriods.map((p) =>
        admin
          .from("period_scores")
          .select("user_id, total_points, final_rank, profiles(name)")
          .eq("period_id", p.id)
          .order("final_rank", { ascending: true })
          .limit(3),
      ),
    );
    pastPeriods.forEach((p, i) => {
      pastScores[p.id] = results[i].data ?? [];
    });
  }

  return { settings, activePeriod, pastPeriods: pastPeriods ?? [], scores, prizes, pastScores, pollOptions, myVote };
}

export async function getAchievementsData(
  userId: string,
  homeId: string,
): Promise<{ achievements: AchievementWithStatus[]; counters: ActivityCounters }> {
  const admin = createAdminClient();

  const [
    { data: allAchievements },
    { data: earned },
    { count: tasksCompleted },
    { count: shoppingDone },
    { count: contributionsPaid },
    { count: periodsWon },
  ] = await Promise.all([
    admin.from("achievements").select("*").order("points"),
    admin
      .from("member_achievements")
      .select("achievement_id, earned_at")
      .eq("home_id", homeId)
      .eq("user_id", userId),
    admin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("shopping_items")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("completed_by", userId),
    admin
      .from("house_contributions")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("user_id", userId)
      .eq("status", "paid"),
    admin
      .from("period_scores")
      .select("*", { count: "exact", head: true })
      .eq("home_id", homeId)
      .eq("user_id", userId)
      .eq("final_rank", 1),
  ]);

  const earnedMap = new Map(
    (earned ?? []).map((e) => [e.achievement_id, e.earned_at]),
  );

  const achievements: AchievementWithStatus[] = (allAchievements ?? []).map((a) => ({
    ...(a as AchievementWithStatus),
    earned: earnedMap.has(a.id),
    earned_at: earnedMap.get(a.id) ?? null,
  }));

  const counters: ActivityCounters = {
    tasks_completed: tasksCompleted ?? 0,
    shopping_done: shoppingDone ?? 0,
    contributions_paid: contributionsPaid ?? 0,
    periods_won: periodsWon ?? 0,
  };

  return { achievements, counters };
}
