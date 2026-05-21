import type { AdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger/logger";
import { awardShoppingPoints } from "./GamificationService";

export async function toggleShoppingItem(
  admin: AdminClient,
  itemId: string,
  done: boolean,
  userId: string,
  homeId: string,
): Promise<void> {
  await admin
    .from("shopping_items")
    .update({ done, completed_by: done ? userId : null })
    .eq("id", itemId);

  if (done) {
    awardShoppingPoints(userId, homeId).catch((e) =>
      logger.error("gamification", "awardShoppingPoints failed", {
        userId,
        homeId,
        error: e,
      }),
    );
  }
}
