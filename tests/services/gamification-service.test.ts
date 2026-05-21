import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { createAdminClient } from "@/lib/supabase/admin";

function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.then = (resolve: (v: unknown) => void) => {
    resolve(resolvedValue);
  };
  for (const m of ["select", "eq", "neq", "lte", "gte", "order", "limit", "in"]) {
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
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: "period-1",
            start_date: "2026-05-01",
            end_date: "2026-05-31",
            period_type: "monthly",
          },
        });
        return chain;
      }
      return makeChain({ data: null, count: 0, error: null });
    }),
    rpc: rpcMock,
  };
}

describe("awardTaskPoints", () => {
  it("calls increment_period_score with base 10 points when no due_date", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock(rpcMock) as never);

    const { awardTaskPoints } = await import("@/lib/services/GamificationService");
    await awardTaskPoints("user-1", "home-1", null, new Date().toISOString());

    expect(rpcMock).toHaveBeenCalledWith(
      "increment_period_score",
      expect.objectContaining({
        p_user_id: "user-1",
        p_home_id: "home-1",
        p_tasks_points: 10,
      }),
    );
  });

  it("adds +5 bonus when task completed before due_date", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(buildAdminMock(rpcMock) as never);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dueDate = futureDate.toISOString().split("T")[0];

    const { awardTaskPoints: award } = await import("@/lib/services/GamificationService");
    await award("user-1", "home-1", dueDate, new Date().toISOString());

    expect(rpcMock).toHaveBeenCalledWith(
      "increment_period_score",
      expect.objectContaining({ p_tasks_points: 15 }),
    );
  });

  it("awards base 10 points when gamification period created on-the-fly", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const adminMock = {
      ...buildAdminMock(rpcMock),
      from: vi.fn((table: string) => {
        if (table === "home_gamification_settings") {
          return makeChain({ data: { enabled: true, period_type: "monthly" } });
        }
        if (table === "ranking_periods") {
          const chain = makeChain({ data: null });
          chain.maybeSingle = vi.fn().mockResolvedValue({ data: null });
          chain.insert = vi.fn().mockReturnThis();
          chain.select = vi.fn().mockReturnThis();
          chain.single = vi.fn().mockResolvedValue({
            data: { id: "new-period", start_date: "2026-06-01", end_date: "2026-06-30", period_type: "monthly" },
          });
          return chain;
        }
        if (table === "homes") {
          return makeChain({ data: { created_by: "owner-1" } });
        }
        return makeChain({ data: null, count: 0, error: null });
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(adminMock as never);

    const { awardShoppingPoints } = await import("@/lib/services/GamificationService");
    await awardShoppingPoints("user-1", "home-1");

    expect(rpcMock).toHaveBeenCalledWith(
      "increment_period_score",
      expect.objectContaining({ p_shopping_points: 3 }),
    );
  });
});
