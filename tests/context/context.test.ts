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

const OWNER_PERMISSIONS = [
  "manage_home", "manage_members", "manage_roles", "manage_invites",
  "create_task", "edit_task", "delete_task",
  "view_finances", "edit_finances",
  "manage_gamification", "view_ranking",
  "create_shopping", "edit_shopping",
];

const MEMBER_PERMISSIONS = [
  "create_task", "edit_task", "delete_task",
  "view_finances", "edit_finances",
  "create_shopping", "edit_shopping",
  "view_ranking", "manage_invites",
];

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
  it("returns Owner role and all permissions when user has Owner role", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("creator-1") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({
        id: "member-1",
        home_id: "home-1",
        homes: { name: "My Home", created_by: "creator-1" },
        roles: {
          id: "role-owner",
          name: "Owner",
          role_permissions: OWNER_PERMISSIONS.map((key) => ({ permissions: { key } })),
        },
      }) as never,
    );

    const { getCurrentContext } = await import("@/lib/context/context.service");
    const ctx = await getCurrentContext();

    expect(ctx.user.id).toBe("creator-1");
    expect(ctx.home.id).toBe("home-1");
    expect(ctx.home.name).toBe("My Home");
    expect(ctx.membership.role).toEqual({ id: "role-owner", name: "Owner" });
    expect(ctx.permissions).toContain("manage_home");
    expect(ctx.permissions).toContain("manage_gamification");
    expect(ctx.permissions).toContain("manage_roles");
    expect(ctx.permissions).toHaveLength(OWNER_PERMISSIONS.length);
  });

  it("returns Member role and limited permissions for regular members", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("member-user") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({
        id: "member-2",
        home_id: "home-1",
        homes: { name: "Shared Home", created_by: "someone-else" },
        roles: {
          id: "role-member",
          name: "Member",
          role_permissions: MEMBER_PERMISSIONS.map((key) => ({ permissions: { key } })),
        },
      }) as never,
    );

    const { getCurrentContext: getCtx } = await import("@/lib/context/context.service");
    const ctx = await getCtx();

    expect(ctx.membership.role).toEqual({ id: "role-member", name: "Member" });
    expect(ctx.permissions).toContain("create_task");
    expect(ctx.permissions).toContain("edit_finances");
    expect(ctx.permissions).not.toContain("manage_home");
    expect(ctx.permissions).not.toContain("manage_roles");
  });

  it("returns null role and empty permissions when role_id is null", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("no-role-user") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock({
        id: "member-3",
        home_id: "home-1",
        homes: { name: "Some Home", created_by: "someone-else" },
        roles: null,
      }) as never,
    );

    const { getCurrentContext: getCtx2 } = await import("@/lib/context/context.service");
    const ctx = await getCtx2();

    expect(ctx.membership.role).toBeNull();
    expect(ctx.permissions).toHaveLength(0);
  });

  it("redirects to /create-home when user has no membership", async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock("homeless-user") as never);
    vi.mocked(createAdminClient).mockReturnValue(
      buildAdminMock(null) as never,
    );

    const { getCurrentContext: getCtx3 } = await import("@/lib/context/context.service");

    await expect(getCtx3()).rejects.toThrow("REDIRECT:/create-home");
  });
});
