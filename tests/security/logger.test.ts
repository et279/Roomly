import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger/logger";

describe("logger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logger.error calls console.error with module and message", () => {
    logger.error("gamification", "test error");
    expect(errorSpy).toHaveBeenCalledOnce();
    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain("[ERROR]");
    expect(line).toContain("[gamification]");
    expect(line).toContain("test error");
  });

  it("logger.error includes userId and homeId context when provided", () => {
    logger.error("tasks", "failed", { userId: "u1", homeId: "h1" });
    const line = errorSpy.mock.calls[0][0] as string;
    expect(line).toContain("userId=u1");
    expect(line).toContain("homeId=h1");
  });

  it("logger.error logs the error stack/message when error object provided", () => {
    const err = new Error("db timeout");
    logger.error("finance", "query failed", { error: err });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // console.error is called as (line, "\n", extractedError) — message is at index 2
    const errorArg = errorSpy.mock.calls[0][2] as string;
    expect(errorArg).toContain("db timeout");
  });

  it("logger.warn calls console.warn", () => {
    logger.warn("home", "something odd");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain("[WARN]");
  });

  it("logger.info calls console.info", () => {
    logger.info("auth", "user logged in");
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy.mock.calls[0][0]).toContain("[INFO]");
  });

  it("includes ISO timestamp in every log line", () => {
    logger.info("test", "timing check");
    const line = infoSpy.mock.calls[0][0] as string;
    // ISO 8601 pattern: 2026-05-20T...
    expect(line).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
