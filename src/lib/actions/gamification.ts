"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/lib/context/context";
import { canManageGamification } from "@/lib/security/authorization";
import {
  awardTaskPoints,
  awardShoppingPoints,
  awardFinancePoints,
  checkAndAwardAchievements,
  getOrCreateActivePeriod,
} from "@/lib/services/GamificationService";
import { logger } from "@/lib/logger/logger";
import type { PeriodType, AchievementWithStatus, ActivityCounters } from "@/types";

export { awardTaskPoints, awardShoppingPoints, awardFinancePoints };

// ── Admin actions ─────────────────────────────────────────────────────────────

export async function configureGamification(_: unknown, formData: FormData) {
  const ctx = await getCurrentContext();
  if (!canManageGamification(ctx))
    return { error: "Solo el admin puede configurar el ranking" };

  const enabled = formData.get("enabled") === "true";
  const periodType = (formData.get("period_type") as PeriodType) ?? "monthly";

  await ctx.admin.from("home_gamification_settings").upsert(
    {
      home_id: ctx.home.id,
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
  const ctx = await getCurrentContext();
  if (!canManageGamification(ctx))
    return { error: "Solo el admin puede configurar los premios" };

  const today = new Date().toISOString().split("T")[0];
  const { data: period } = await ctx.admin
    .from("ranking_periods")
    .select("id")
    .eq("home_id", ctx.home.id)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (!period) return { error: "No hay período activo aún" };

  await ctx.admin.from("ranking_prizes").delete().eq("period_id", period.id);

  const prizes = [1, 2, 3]
    .map((rank) => ({
      period_id: period.id,
      rank,
      prize_description: (
        (formData.get(`prize_${rank}`) as string) ?? ""
      ).trim(),
    }))
    .filter((p) => p.prize_description.length > 0);

  if (prizes.length > 0) {
    await ctx.admin.from("ranking_prizes").insert(prizes);
  }

  revalidatePath("/ranking");
  return { success: true };
}

// Uses close_period_atomic RPC (migration 010) — rank assignment + period close in one transaction
export async function closePeriod(periodId: string) {
  const ctx = await getCurrentContext();
  if (!canManageGamification(ctx))
    return { error: "Solo el admin puede cerrar el período" };

  const { data: result, error } = await ctx.admin.rpc("close_period_atomic", {
    p_period_id: periodId,
    p_requesting_user_id: ctx.user.id,
  });

  if (error) {
    logger.error("gamification", "close_period_atomic RPC failed", {
      userId: ctx.user.id,
      error,
    });
    return { error: "Error al cerrar el período" };
  }

  const rpcResult = result as {
    error?: string;
    success?: boolean;
    winner_id?: string;
    home_id?: string;
  } | null;

  if (rpcResult?.error) return { error: rpcResult.error };

  if (rpcResult?.winner_id && rpcResult?.home_id) {
    await checkAndAwardAchievements(
      ctx.admin,
      rpcResult.winner_id,
      rpcResult.home_id,
      null,
    );
  }

  revalidatePath("/ranking");
  return { success: true };
}

export async function savePollOptions(_: unknown, formData: FormData) {
  const ctx = await getCurrentContext();
  if (!canManageGamification(ctx))
    return { error: "Solo el admin puede configurar las opciones" };

  const today = new Date().toISOString().split("T")[0];
  const { data: period } = await ctx.admin
    .from("ranking_periods")
    .select("id")
    .eq("home_id", ctx.home.id)
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
      home_id: ctx.home.id,
      option_text,
      created_by: ctx.user.id,
    }));

  if (options.length < 2) return { error: "Necesitás al menos 2 opciones" };

  await ctx.admin.from("prize_poll_options").delete().eq("period_id", period.id);
  await ctx.admin.from("prize_poll_options").insert(options);

  revalidatePath("/ranking");
  return { success: true };
}

export async function votePollOption(optionId: string) {
  const ctx = await getCurrentContext();

  const { data: option } = await ctx.admin
    .from("prize_poll_options")
    .select("period_id, home_id")
    .eq("id", optionId)
    .single();

  if (!option) return { error: "Opción no válida" };
  if (option.home_id !== ctx.home.id) return { error: "No pertenecés a este hogar" };

  await ctx.admin.from("prize_poll_votes").upsert(
    {
      option_id: optionId,
      period_id: option.period_id,
      user_id: ctx.user.id,
      home_id: option.home_id,
    },
    { onConflict: "period_id,user_id" },
  );

  revalidatePath("/ranking");
  return { success: true };
}

// ── Data fetching ────────────────────────────────────────────────────────────

export async function getRankingData(homeId: string, userId?: string) {
  const { admin } = await getCurrentContext();
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
    const [
      { data: scoresData },
      { data: prizesData },
      { data: pollOpts },
      { data: myVoteRow },
      { data: allVotes },
    ] = await Promise.all([
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
      admin
        .from("prize_poll_votes")
        .select("option_id")
        .eq("period_id", activePeriod.id),
    ]);

    scores = scoresData;
    prizes = prizesData;
    myVote = (myVoteRow as { option_id: string } | null)?.option_id ?? null;

    if (pollOpts?.length) {
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

  return {
    settings,
    activePeriod,
    pastPeriods: pastPeriods ?? [],
    scores,
    prizes,
    pastScores,
    pollOptions,
    myVote,
  };
}

export async function getAchievementsData(
  userId: string,
  homeId: string,
): Promise<{ achievements: AchievementWithStatus[]; counters: ActivityCounters }> {
  const { admin } = await getCurrentContext();

  const [
    { data: allAchievements },
    { data: earned },
    { count: tasksCompleted },
    { count: shoppingDone },
    { count: contributionsPaid },
    { count: periodsWon },
  ] = await Promise.all([
    admin
      .from("achievements")
      .select(
        "id, key, name, description, icon, category, points, condition_type, condition_value",
      )
      .order("points"),
    admin
      .from("member_achievements")
      .select("achievement_id, earned_at")
      .eq("home_id", homeId)
      .eq("user_id", userId),
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

  const earnedMap = new Map(
    (earned ?? []).map((e) => [e.achievement_id, e.earned_at]),
  );

  const achievements: AchievementWithStatus[] = (allAchievements ?? []).map(
    (a) => ({
      ...(a as AchievementWithStatus),
      earned: earnedMap.has(a.id),
      earned_at: earnedMap.get(a.id) ?? null,
    }),
  );

  const counters: ActivityCounters = {
    tasks_completed: tasksCompleted ?? 0,
    shopping_done: shoppingDone ?? 0,
    contributions_paid: contributionsPaid ?? 0,
    periods_won: periodsWon ?? 0,
  };

  return { achievements, counters };
}

export async function startPeriod(homeId: string) {
  const { admin } = await getCurrentContext();
  return getOrCreateActivePeriod(admin, homeId);
}
