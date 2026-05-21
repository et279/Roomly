import { describe, it, expect } from "vitest";
import {
  isOwner,
  isAdmin,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageHome,
  canManageMembers,
  canManageRoles,
  canManageInvites,
  canManageGamification,
  canEditFinance,
} from "@/lib/security/authorization";
import type { AppContext } from "@/lib/context/context.types";

function makeCtx(roleName: string | null, permissions: string[] = []): AppContext {
  return {
    user: { id: "user-1", email: "user@test.com" },
    home: { id: "home-1", name: "Test Home" },
    membership: {
      id: "member-1",
      role: roleName ? { id: "role-1", name: roleName } : null,
    },
    permissions,
  };
}

const ALL_PERMS = [
  "manage_home", "manage_members", "manage_roles", "manage_invites",
  "create_task", "edit_task", "delete_task",
  "view_finances", "edit_finances",
  "manage_gamification", "view_ranking",
  "create_shopping", "edit_shopping",
];
const MEMBER_PERMS = [
  "create_task", "edit_task", "delete_task",
  "view_finances", "edit_finances",
  "create_shopping", "edit_shopping",
  "view_ranking", "manage_invites",
];

describe("isOwner", () => {
  it("returns true when role name is Owner", () => {
    expect(isOwner(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns false for Admin role", () => {
    expect(isOwner(makeCtx("Admin", ALL_PERMS.filter((p) => p !== "manage_roles")))).toBe(false);
  });

  it("returns false when role is null", () => {
    expect(isOwner(makeCtx(null))).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for Owner", () => {
    expect(isAdmin(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns true for Admin", () => {
    expect(isAdmin(makeCtx("Admin", []))).toBe(true);
  });

  it("returns false for Member", () => {
    expect(isAdmin(makeCtx("Member", MEMBER_PERMS))).toBe(false);
  });

  it("returns false for null role", () => {
    expect(isAdmin(makeCtx(null))).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true when permission is in ctx.permissions", () => {
    const ctx = makeCtx("Owner", ALL_PERMS);
    expect(hasPermission(ctx, "manage_home")).toBe(true);
    expect(hasPermission(ctx, "manage_roles")).toBe(true);
  });

  it("returns false for permission not in ctx.permissions", () => {
    const ctx = makeCtx("Member", MEMBER_PERMS);
    expect(hasPermission(ctx, "manage_home")).toBe(false);
    expect(hasPermission(ctx, "manage_roles")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when at least one permission matches", () => {
    const ctx = makeCtx("Member", MEMBER_PERMS);
    expect(hasAnyPermission(ctx, ["manage_home", "create_task"])).toBe(true);
  });

  it("returns false when none match", () => {
    const ctx = makeCtx("Guest", ["view_ranking"]);
    expect(hasAnyPermission(ctx, ["manage_home", "create_task"])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when all permissions match", () => {
    const ctx = makeCtx("Member", MEMBER_PERMS);
    expect(hasAllPermissions(ctx, ["create_task", "edit_task"])).toBe(true);
  });

  it("returns false when any permission is missing", () => {
    const ctx = makeCtx("Member", MEMBER_PERMS);
    expect(hasAllPermissions(ctx, ["create_task", "manage_home"])).toBe(false);
  });
});

describe("canManageHome", () => {
  it("returns true for Owner", () => {
    expect(canManageHome(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns false for Member", () => {
    expect(canManageHome(makeCtx("Member", MEMBER_PERMS))).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("returns true for Owner", () => {
    expect(canManageMembers(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns false for Member", () => {
    expect(canManageMembers(makeCtx("Member", MEMBER_PERMS))).toBe(false);
  });
});

describe("canManageRoles", () => {
  it("returns true only for Owner (has manage_roles)", () => {
    expect(canManageRoles(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns false for Admin (no manage_roles)", () => {
    const adminPerms = ALL_PERMS.filter((p) => p !== "manage_roles");
    expect(canManageRoles(makeCtx("Admin", adminPerms))).toBe(false);
  });

  it("returns false for Member", () => {
    expect(canManageRoles(makeCtx("Member", MEMBER_PERMS))).toBe(false);
  });
});

describe("canManageInvites", () => {
  it("returns true for Owner", () => {
    expect(canManageInvites(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns true for Member (has manage_invites)", () => {
    expect(canManageInvites(makeCtx("Member", MEMBER_PERMS))).toBe(true);
  });

  it("returns false for Guest", () => {
    expect(canManageInvites(makeCtx("Guest", ["view_ranking"]))).toBe(false);
  });
});

describe("canManageGamification", () => {
  it("returns true for Owner", () => {
    expect(canManageGamification(makeCtx("Owner", ALL_PERMS))).toBe(true);
  });

  it("returns false for Member", () => {
    expect(canManageGamification(makeCtx("Member", MEMBER_PERMS))).toBe(false);
  });
});

describe("canEditFinance", () => {
  it("returns true when user has edit_finances permission", () => {
    expect(canEditFinance(makeCtx("Owner", ALL_PERMS))).toBe(true);
    expect(canEditFinance(makeCtx("Member", MEMBER_PERMS))).toBe(true);
  });

  it("returns false when user lacks edit_finances permission", () => {
    expect(canEditFinance(makeCtx("Guest", ["view_ranking"]))).toBe(false);
    expect(canEditFinance(makeCtx("Adult", ["create_task", "edit_task", "view_finances", "create_shopping", "edit_shopping", "view_ranking"]))).toBe(false);
  });
});
