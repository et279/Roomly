import { describe, it, expect, vi } from "vitest";
import {
  verifyTaskOwnership,
  verifyShoppingOwnership,
  verifyFinancialOwnership,
  verifyContributionOwnership,
  verifySavingOwnership,
} from "@/lib/security/ownership";

// Minimal admin mock that returns a controllable single() result
function makeMockAdmin(homeId: string | null) {
  const single = vi.fn().mockResolvedValue({ data: homeId ? { home_id: homeId } : null });
  const eq = vi.fn().mockReturnThis();
  const select = vi.fn().mockReturnThis();
  const from = vi.fn().mockReturnValue({ select, eq, single });
  return { from };
}

// ── verifyTaskOwnership ───────────────────────────────────────────────────────

describe("verifyTaskOwnership", () => {
  it("returns true when task home_id matches caller's homeId", async () => {
    const admin = makeMockAdmin("home-abc");
    const result = await verifyTaskOwnership(
      admin as never,
      "task-123",
      "home-abc",
    );
    expect(result).toBe(true);
  });

  it("returns false when task belongs to a different home", async () => {
    const admin = makeMockAdmin("home-xyz");
    const result = await verifyTaskOwnership(
      admin as never,
      "task-123",
      "home-abc",
    );
    expect(result).toBe(false);
  });

  it("returns false when task does not exist (null data)", async () => {
    const admin = makeMockAdmin(null);
    const result = await verifyTaskOwnership(
      admin as never,
      "task-not-found",
      "home-abc",
    );
    expect(result).toBe(false);
  });
});

// ── verifyShoppingOwnership ───────────────────────────────────────────────────

describe("verifyShoppingOwnership", () => {
  it("returns true when item belongs to caller's home", async () => {
    const admin = makeMockAdmin("home-abc");
    expect(
      await verifyShoppingOwnership(admin as never, "item-1", "home-abc"),
    ).toBe(true);
  });

  it("returns false when item belongs to a different home", async () => {
    const admin = makeMockAdmin("home-other");
    expect(
      await verifyShoppingOwnership(admin as never, "item-1", "home-abc"),
    ).toBe(false);
  });
});

// ── verifyFinancialOwnership ──────────────────────────────────────────────────

describe("verifyFinancialOwnership", () => {
  it("returns true when record belongs to caller's home", async () => {
    const admin = makeMockAdmin("home-abc");
    expect(
      await verifyFinancialOwnership(admin as never, "record-1", "home-abc"),
    ).toBe(true);
  });

  it("returns false when record belongs to a different home", async () => {
    const admin = makeMockAdmin("home-other");
    expect(
      await verifyFinancialOwnership(admin as never, "record-1", "home-abc"),
    ).toBe(false);
  });
});

// ── verifyContributionOwnership ───────────────────────────────────────────────

describe("verifyContributionOwnership", () => {
  it("returns true when contribution belongs to caller's home", async () => {
    const admin = makeMockAdmin("home-abc");
    expect(
      await verifyContributionOwnership(admin as never, "contrib-1", "home-abc"),
    ).toBe(true);
  });

  it("returns false when contribution belongs to a different home", async () => {
    const admin = makeMockAdmin("home-other");
    expect(
      await verifyContributionOwnership(admin as never, "contrib-1", "home-abc"),
    ).toBe(false);
  });
});

// ── verifySavingOwnership ─────────────────────────────────────────────────────

describe("verifySavingOwnership", () => {
  it("returns true when goal belongs to caller's home", async () => {
    const admin = makeMockAdmin("home-abc");
    expect(
      await verifySavingOwnership(admin as never, "goal-1", "home-abc"),
    ).toBe(true);
  });

  it("returns false when goal belongs to a different home", async () => {
    const admin = makeMockAdmin("home-other");
    expect(
      await verifySavingOwnership(admin as never, "goal-1", "home-abc"),
    ).toBe(false);
  });
});
