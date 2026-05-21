import { describe, it, expect } from "vitest";
import {
  isOwner,
  hasPermission,
  canManageHome,
  canManageMembers,
  canManageGamification,
  canEditFinance,
} from "@/lib/security/authorization";
import type { AppContext } from "@/lib/context/context.types";

function makeCtx(role: string | null): AppContext {
  return {
    user: { id: "user-1", email: "user@test.com" },
    home: { id: "home-1", name: "Test Home" },
    membership: { id: "member-1", role },
    permissions: role === "admin" ? ["admin", "member"] : ["member"],
  };
}

describe("isOwner", () => {
  it("returns true when role is admin", () => {
    expect(isOwner(makeCtx("admin"))).toBe(true);
  });

  it("returns false when role is null (regular member)", () => {
    expect(isOwner(makeCtx(null))).toBe(false);
  });

  it("returns false when role is member string", () => {
    expect(isOwner(makeCtx("member"))).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true when permission is in ctx.permissions", () => {
    const ctx = makeCtx("admin");
    expect(hasPermission(ctx, "admin")).toBe(true);
    expect(hasPermission(ctx, "member")).toBe(true);
  });

  it("returns false for permission not in ctx.permissions", () => {
    const ctx = makeCtx(null);
    expect(hasPermission(ctx, "admin")).toBe(false);
  });
});

describe("canManageHome", () => {
  it("returns true for admin", () => {
    expect(canManageHome(makeCtx("admin"))).toBe(true);
  });

  it("returns false for non-admin", () => {
    expect(canManageHome(makeCtx(null))).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("returns true for admin", () => {
    expect(canManageMembers(makeCtx("admin"))).toBe(true);
  });

  it("returns false for non-admin", () => {
    expect(canManageMembers(makeCtx(null))).toBe(false);
  });
});

describe("canManageGamification", () => {
  it("returns true for admin", () => {
    expect(canManageGamification(makeCtx("admin"))).toBe(true);
  });

  it("returns false for non-admin", () => {
    expect(canManageGamification(makeCtx(null))).toBe(false);
  });
});

describe("canEditFinance", () => {
  it("returns true for all members", () => {
    expect(canEditFinance(makeCtx("admin"))).toBe(true);
    expect(canEditFinance(makeCtx(null))).toBe(true);
  });
});
