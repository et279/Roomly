import { describe, it, expect, vi } from "vitest";
import { resolveContributionStatus } from "@/lib/services/FinanceService";

// resolveContributionStatus is a pure function — no mocking needed

describe("resolveContributionStatus", () => {
  it("returns 'paid' when paidAmount >= amount", () => {
    expect(resolveContributionStatus(100, 100, "2030-01-01")).toBe("paid");
    expect(resolveContributionStatus(100, 150, "2030-01-01")).toBe("paid");
  });

  it("returns 'partial' when paidAmount > 0 but < amount", () => {
    expect(resolveContributionStatus(100, 50, "2030-01-01")).toBe("partial");
    expect(resolveContributionStatus(100, 1, "2030-01-01")).toBe("partial");
  });

  it("returns 'overdue' when paidAmount is 0 and due_date is in the past", () => {
    const pastDate = "2000-01-01";
    expect(resolveContributionStatus(100, 0, pastDate)).toBe("overdue");
  });

  it("returns 'pending' when paidAmount is 0 and due_date is in the future", () => {
    const futureDate = "2099-12-31";
    expect(resolveContributionStatus(100, 0, futureDate)).toBe("pending");
  });

  it("paid takes priority over overdue (paid full amount even if past due)", () => {
    const pastDate = "2000-01-01";
    expect(resolveContributionStatus(100, 100, pastDate)).toBe("paid");
  });

  it("partial takes priority over overdue (partial payment even if past due)", () => {
    const pastDate = "2000-01-01";
    expect(resolveContributionStatus(100, 50, pastDate)).toBe("partial");
  });
});

describe("applyContributionPayment", () => {
  it("updates contribution record and awards finance points when paid in full", async () => {
    const { applyContributionPayment } = await import("@/lib/services/FinanceService");

    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const adminMock = {
      from: vi.fn(() => ({ update: updateMock, eq: eqMock })),
    };

    // wire update().eq() chain
    updateMock.mockReturnValue({ eq: eqMock });

    await applyContributionPayment(
      adminMock as never,
      "contrib-1",
      { amount: 100, due_date: "2030-01-01", user_id: "user-1", home_id: "home-1" },
      100,
    );

    expect(adminMock.from).toHaveBeenCalledWith("house_contributions");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ paid_amount: 100, status: "paid" }),
    );
  });
});
