import { describe, it, expect, vi } from "vitest";

// Integration test: verifies that upsertPeriodScore delegates to the RPC
// and does NOT do a read-then-write (which would be racy).

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

// A chain mock where `.then(resolve)` calls resolve immediately — allows `await chain` to work
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.then = (resolve: (v: unknown) => void) => { resolve(resolvedValue); };
  for (const m of ["select", "eq", "neq", "in", "or", "lte", "gte", "order", "limit"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  return chain;
}

function buildAdminMock(rpcMock: ReturnType<typeof vi.fn>) {
  return {
    from: vi.fn((table: string) => {
      if (table === "home_gamification_settings") {
        return makeChain({ data: { enabled: true, period_type: "monthly" } });
      }
      if (table === "ranking_periods") {
        const chain = makeChain({ data: null });
        // maybeSingle on active period check returns the active period
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: "period-1", start_date: "2026-05-01", end_date: "2026-05-31", period_type: "monthly" },
        });
        return chain;
      }
      // All other tables (achievements, member_achievements, tasks, etc.)
      // return empty data so checkAndAwardAchievements exits quickly
      return makeChain({ data: null, count: 0, error: null });
    }),
    rpc: rpcMock,
  };
}

describe("awardTaskPoints — delegates to increment_period_score RPC", () => {
  it("calls rpc('increment_period_score') instead of read-then-write", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock(rpcMock) as never);

    const { awardTaskPoints } = await import("@/lib/actions/gamification");
    await awardTaskPoints("user-1", "home-1", null, new Date().toISOString());

    expect(rpcMock).toHaveBeenCalledWith(
      "increment_period_score",
      expect.objectContaining({
        p_period_id: "period-1",
        p_home_id: "home-1",
        p_user_id: "user-1",
        p_tasks_points: 10,
      }),
    );
  });

  it("awards bonus points (+5) when task is completed before due_date", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const adminMock = {
      ...buildAdminMock(rpcMock),
      from: vi.fn((table: string) => {
        if (table === "home_gamification_settings") {
          return makeChain({ data: { enabled: true, period_type: "monthly" } });
        }
        if (table === "ranking_periods") {
          const chain = makeChain({ data: null });
          chain.maybeSingle = vi.fn().mockResolvedValue({
            data: { id: "period-2", start_date: "2026-05-01", end_date: "2026-05-31", period_type: "monthly" },
          });
          return chain;
        }
        return makeChain({ data: null, count: 0, error: null });
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(adminMock as never);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dueDateStr = futureDate.toISOString().split("T")[0];

    const { awardTaskPoints } = await import("@/lib/actions/gamification");
    await awardTaskPoints("user-1", "home-1", dueDateStr, new Date().toISOString());

    expect(rpcMock).toHaveBeenCalledWith(
      "increment_period_score",
      expect.objectContaining({ p_tasks_points: 15 }),
    );
  });
});
