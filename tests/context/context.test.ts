import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function buildSupabaseMock(userId: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: `${userId}@test.com` } },
      }),
    },
  };
}

function buildAdminMock(membershipData: unknown) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: membershipData }),
    })),
  };
}

describe("getCurrentContext", () => {
  it("returns admin role when user is the home creator", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("creator-1") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({
        id: "member-1",
        home_id: "home-1",
        homes: { name: "My Home", created_by: "creator-1" },
      }) as never,
    );

    const { getCurrentContext } = await import("@/lib/context/context.service");
    const ctx = await getCurrentContext();

    expect(ctx.user.id).toBe("creator-1");
    expect(ctx.home.id).toBe("home-1");
    expect(ctx.home.name).toBe("My Home");
    expect(ctx.membership.role).toBe("admin");
    expect(ctx.permissions).toContain("admin");
    expect(ctx.permissions).toContain("member");
  });

  it("returns null role when user is a regular member", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("member-user") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({
        id: "member-2",
        home_id: "home-1",
        homes: { name: "Shared Home", created_by: "someone-else" },
      }) as never,
    );

    const { getCurrentContext: getCtx } = await import("@/lib/context/context.service");
    const ctx = await getCtx();

    expect(ctx.membership.role).toBeNull();
    expect(ctx.permissions).not.toContain("admin");
    expect(ctx.permissions).toContain("member");
  });

  it("redirects to /create-home when user has no membership", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("homeless-user") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock(null) as never,
    );

    const { getCurrentContext: getCtx2 } = await import("@/lib/context/context.service");

    await expect(getCtx2()).rejects.toThrow("REDIRECT:/create-home");
  });
});
