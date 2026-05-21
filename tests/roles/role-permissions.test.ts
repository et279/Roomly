import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, Permission } from "@/lib/security/permissions";
import {
  isOwner,
  isAdmin,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageRoles,
  canEditFinance,
} from "@/lib/security/authorization";
import type { AppContext } from "@/lib/context/context.types";

// Helper: build an AppContext from a role name + its permission list
function ctxFor(roleName: string): AppContext {
  const perms = ROLE_PERMISSIONS[roleName] ?? [];
  return {
    user: { id: "u1", email: "u@test.com" },
    home: { id: "h1", name: "Test Home" },
    membership: { id: "m1", role: { id: "r1", name: roleName } },
    permissions: [...perms],
  };
}

// ── Role: Owner ───────────────────────────────────────────────────────────────

describe("Role: Owner", () => {
  const ctx = ctxFor("Owner");

  it("has all 13 permissions", () => {
    expect(ctx.permissions).toHaveLength(Object.values(Permission).length);
  });

  it("has manage_roles", () => {
    expect(hasPermission(ctx, Permission.MANAGE_ROLES)).toBe(true);
  });

  it("has manage_gamification", () => {
    expect(hasPermission(ctx, Permission.MANAGE_GAMIFICATION)).toBe(true);
  });

  it("isOwner returns true", () => {
    expect(isOwner(ctx)).toBe(true);
  });

  it("isAdmin returns true", () => {
    expect(isAdmin(ctx)).toBe(true);
  });

  it("canManageRoles returns true", () => {
    expect(canManageRoles(ctx)).toBe(true);
  });
});

// ── Role: Admin ───────────────────────────────────────────────────────────────

describe("Role: Admin", () => {
  const ctx = ctxFor("Admin");

  it("does NOT have manage_roles", () => {
    expect(hasPermission(ctx, Permission.MANAGE_ROLES)).toBe(false);
  });

  it("has manage_home, manage_members, manage_gamification", () => {
    expect(hasPermission(ctx, Permission.MANAGE_HOME)).toBe(true);
    expect(hasPermission(ctx, Permission.MANAGE_MEMBERS)).toBe(true);
    expect(hasPermission(ctx, Permission.MANAGE_GAMIFICATION)).toBe(true);
  });

  it("isOwner returns false", () => {
    expect(isOwner(ctx)).toBe(false);
  });

  it("isAdmin returns true", () => {
    expect(isAdmin(ctx)).toBe(true);
  });

  it("canManageRoles returns false", () => {
    expect(canManageRoles(ctx)).toBe(false);
  });
});

// ── Role: Adult ───────────────────────────────────────────────────────────────

describe("Role: Adult", () => {
  const ctx = ctxFor("Adult");

  it("has create_task and edit_task", () => {
    expect(hasPermission(ctx, Permission.CREATE_TASK)).toBe(true);
    expect(hasPermission(ctx, Permission.EDIT_TASK)).toBe(true);
  });

  it("does NOT have delete_task", () => {
    expect(hasPermission(ctx, Permission.DELETE_TASK)).toBe(false);
  });

  it("does NOT have edit_finances", () => {
    expect(hasPermission(ctx, Permission.EDIT_FINANCES)).toBe(false);
  });

  it("does NOT have manage_home or manage_roles", () => {
    expect(hasPermission(ctx, Permission.MANAGE_HOME)).toBe(false);
    expect(hasPermission(ctx, Permission.MANAGE_ROLES)).toBe(false);
  });

  it("canEditFinance returns false", () => {
    expect(canEditFinance(ctx)).toBe(false);
  });

  it("isOwner and isAdmin return false", () => {
    expect(isOwner(ctx)).toBe(false);
    expect(isAdmin(ctx)).toBe(false);
  });
});

// ── Role: Member ──────────────────────────────────────────────────────────────

describe("Role: Member", () => {
  const ctx = ctxFor("Member");

  it("has create_task, edit_task, delete_task", () => {
    expect(hasPermission(ctx, Permission.CREATE_TASK)).toBe(true);
    expect(hasPermission(ctx, Permission.EDIT_TASK)).toBe(true);
    expect(hasPermission(ctx, Permission.DELETE_TASK)).toBe(true);
  });

  it("has edit_finances", () => {
    expect(hasPermission(ctx, Permission.EDIT_FINANCES)).toBe(true);
  });

  it("has manage_invites", () => {
    expect(hasPermission(ctx, Permission.MANAGE_INVITES)).toBe(true);
  });

  it("does NOT have manage_home, manage_members, manage_roles", () => {
    expect(hasPermission(ctx, Permission.MANAGE_HOME)).toBe(false);
    expect(hasPermission(ctx, Permission.MANAGE_MEMBERS)).toBe(false);
    expect(hasPermission(ctx, Permission.MANAGE_ROLES)).toBe(false);
  });

  it("canEditFinance returns true", () => {
    expect(canEditFinance(ctx)).toBe(true);
  });

  it("isOwner and isAdmin return false", () => {
    expect(isOwner(ctx)).toBe(false);
    expect(isAdmin(ctx)).toBe(false);
  });
});

// ── Role: Guest ───────────────────────────────────────────────────────────────

describe("Role: Guest", () => {
  const ctx = ctxFor("Guest");

  it("has only view_ranking", () => {
    expect(ctx.permissions).toEqual([Permission.VIEW_RANKING]);
  });

  it("cannot do anything else", () => {
    expect(hasPermission(ctx, Permission.CREATE_TASK)).toBe(false);
    expect(hasPermission(ctx, Permission.EDIT_FINANCES)).toBe(false);
    expect(hasPermission(ctx, Permission.MANAGE_INVITES)).toBe(false);
    expect(hasPermission(ctx, Permission.MANAGE_HOME)).toBe(false);
  });

  it("isOwner and isAdmin return false", () => {
    expect(isOwner(ctx)).toBe(false);
    expect(isAdmin(ctx)).toBe(false);
  });

  it("canManageRoles returns false", () => {
    expect(canManageRoles(ctx)).toBe(false);
  });
});

// ── hasAnyPermission / hasAllPermissions ──────────────────────────────────────

describe("hasAnyPermission", () => {
  it("returns true when at least one perm matches", () => {
    const ctx = ctxFor("Member");
    expect(hasAnyPermission(ctx, ["manage_home", "create_task"])).toBe(true);
  });

  it("returns false when no perms match", () => {
    const ctx = ctxFor("Guest");
    expect(hasAnyPermission(ctx, ["manage_home", "create_task"])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when all perms match", () => {
    const ctx = ctxFor("Member");
    expect(hasAllPermissions(ctx, ["create_task", "edit_task", "delete_task"])).toBe(true);
  });

  it("returns false when any perm is missing", () => {
    const ctx = ctxFor("Member");
    expect(hasAllPermissions(ctx, ["create_task", "manage_home"])).toBe(false);
  });
});

// ── Action-level unauthorized scenario ───────────────────────────────────────

describe("Unauthorized action scenario", () => {
  it("Guest cannot manage home", () => {
    const ctx = ctxFor("Guest");
    const authorized = hasPermission(ctx, Permission.MANAGE_HOME);
    const response = authorized ? { success: true } : { error: "Sin permiso para gestionar el hogar" };
    expect(response).toEqual({ error: "Sin permiso para gestionar el hogar" });
  });

  it("Adult cannot edit finances", () => {
    const ctx = ctxFor("Adult");
    const authorized = canEditFinance(ctx);
    const response = authorized ? { success: true } : { error: "Sin permiso para registrar movimientos financieros" };
    expect(response).toEqual({ error: "Sin permiso para registrar movimientos financieros" });
  });
});
