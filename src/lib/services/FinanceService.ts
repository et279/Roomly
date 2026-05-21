import type { AdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import { awardFinancePoints } from "./GamificationService";
import type { ContributionStatus } from "@/types";

export function resolveContributionStatus(
  amount: number,
  paidAmount: number,
  dueDate: string,
): ContributionStatus {
  if (paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partial";
  if (new Date(dueDate) < new Date()) return "overdue";
  return "pending";
}

export async function applyContributionPayment(
  admin: AdminClient,
  contributionId: string,
  contribution: { amount: number; due_date: string; user_id: string; home_id: string },
  paidAmount: number,
): Promise<void> {
  const status = resolveContributionStatus(contribution.amount, paidAmount, contribution.due_date);

  await admin
    .from("house_contributions")
    .update({ paid_amount: paidAmount, status, updated_at: new Date().toISOString() })
    .eq("id", contributionId);

  if (status === "paid") {
    awardFinancePoints(contribution.user_id, contribution.home_id).catch((e) =>
      logger.error("gamification", "awardFinancePoints failed", {
        userId: contribution.user_id,
        homeId: contribution.home_id,
        error: e,
      }),
    );
  }
}
