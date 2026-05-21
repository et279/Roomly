import { describe, it, expect, vi } from "vitest";

// closePeriod now uses getCurrentContext() which queries home_members + homes.
// The mocks here cover both the context query and the RPC call.

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-user-1", email: "admin@test.com" } },
      }),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function buildAdminMockForClose(rpcResult: unknown) {
  const rpcMock = vi.fn().mockResolvedValue({ data: rpcResult, error: null });

  const adminMock = {
    from: vi.fn((table: string) => {
      if (table === "home_members") {
        // getCurrentContext() queries home_members with homes join
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "member-1",
              home_id: "home-1",
              homes: { name: "Test Home", created_by: "admin-user-1" },
            },
          }),
          single: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      // Other tables (achievements, etc.) return null
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    }),
    rpc: rpcMock,
  };

  return { adminMock, rpcMock };
}

describe("closePeriod — delegates to close_period_atomic RPC", () => {
  it("calls close_period_atomic with correct period and user IDs", async () => {
    const { adminMock, rpcMock } = buildAdminMockForClose({
      success: true,
      winner_id: "winner-user",
      home_id: "home-1",
    });

    vi.mocked(createAdminClient).mockReturnValue(adminMock as never);

    const { closePeriod } = await import("@/lib/actions/gamification");
    const result = await closePeriod("period-abc");

    expect(rpcMock).toHaveBeenCalledWith("close_period_atomic", {
      p_period_id: "period-abc",
      p_requesting_user_id: "admin-user-1",
    });
    expect(result).toEqual({ success: true });
  });

  it("returns error when RPC returns an error string", async () => {
    const { adminMock } = buildAdminMockForClose({
      error: "Solo el admin puede cerrar el período",
    });

    vi.mocked(createAdminClient).mockReturnValue(adminMock as never);

    const { closePeriod: close } = await import("@/lib/actions/gamification");
    const result = await close("period-abc");

    expect(result).toEqual({ error: "Solo el admin puede cerrar el período" });
  });

  it("returns error when Supabase RPC itself fails", async () => {
    const adminMock = {
      from: vi.fn((table: string) => {
        if (table === "home_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "member-1",
                home_id: "home-1",
                homes: { name: "Test Home", created_by: "admin-user-1" },
              },
            }),
            single: vi.fn().mockResolvedValue({ data: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }),
        };
      }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("connection timeout"),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(adminMock as never);

    const { closePeriod: close2 } = await import("@/lib/actions/gamification");
    const result = await close2("period-abc");

    expect(result).toEqual({ error: "Error al cerrar el período" });
  });
});
