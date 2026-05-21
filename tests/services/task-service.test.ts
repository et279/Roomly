import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/services/GamificationService", () => ({
  awardTaskPoints: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { completeTask, uncompleteTask } from "@/lib/services/TaskService";

function makeAdminMock() {
  const eqChain = {
    eq: vi.fn(),
  };
  eqChain.eq.mockReturnValue(eqChain);

  const updateChain = {
    update: vi.fn().mockReturnValue(eqChain),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnValue(eqChain),
  };

  return {
    from: vi.fn().mockReturnValue(updateChain),
    _updateChain: updateChain,
    _eqChain: eqChain,
  };
}

describe("completeTask", () => {
  it("updates the task as done with completed_by and completed_at", async () => {
    const admin = makeAdminMock();

    await completeTask(admin as never, "task-1", "user-1", {
      home_id: "home-1",
      title: "Buy milk",
      assigned_to: null,
      created_by: "user-1",
      due_date: null,
      recurrence: null,
    });

    expect(admin.from).toHaveBeenCalledWith("tasks");
    expect(admin._updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        done: true,
        completed_by: "user-1",
      }),
    );
  });

  it("inserts a recurring task when recurrence is set", async () => {
    const admin = makeAdminMock();
    admin._eqChain.eq.mockResolvedValue({ data: null, error: null });

    await completeTask(admin as never, "task-1", "user-1", {
      home_id: "home-1",
      title: "Weekly chore",
      assigned_to: "user-2",
      created_by: "user-1",
      due_date: "2026-06-01",
      recurrence: "weekly",
    });

    expect(admin._updateChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        home_id: "home-1",
        title: "Weekly chore",
        recurrence: "weekly",
        done: false,
      }),
    );
  });

  it("does NOT insert a recurring task when recurrence is null", async () => {
    const admin = makeAdminMock();
    admin._eqChain.eq.mockResolvedValue({ data: null, error: null });

    await completeTask(admin as never, "task-1", "user-1", {
      home_id: "home-1",
      title: "One-off task",
      assigned_to: null,
      created_by: "user-1",
      due_date: null,
      recurrence: null,
    });

    expect(admin._updateChain.insert).not.toHaveBeenCalled();
  });
});

describe("uncompleteTask", () => {
  it("updates the task as not done clearing completed fields", async () => {
    const admin = makeAdminMock();
    admin._eqChain.eq.mockResolvedValue({ data: null, error: null });

    await uncompleteTask(admin as never, "task-1");

    expect(admin._updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        done: false,
        completed_by: null,
        completed_at: null,
      }),
    );
  });
});
