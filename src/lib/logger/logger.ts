type LogLevel = "error" | "warn" | "info";

interface LogOptions {
  userId?: string;
  homeId?: string;
  error?: unknown;
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  options?: LogOptions,
): string {
  const ts = new Date().toISOString();
  const ctx = [
    options?.userId ? `userId=${options.userId}` : null,
    options?.homeId ? `homeId=${options.homeId}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return `[${ts}] [${level.toUpperCase()}] [${module}] ${message}${ctx ? ` | ${ctx}` : ""}`;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const logger = {
  error(module: string, message: string, options?: LogOptions): void {
    const line = formatMessage("error", module, message, options);
    if (options?.error !== undefined) {
      console.error(line, "\n", extractErrorMessage(options.error));
    } else {
      console.error(line);
    }
  },

  warn(module: string, message: string, options?: Omit<LogOptions, "error">): void {
    console.warn(formatMessage("warn", module, message, options));
  },

  info(module: string, message: string, options?: Omit<LogOptions, "error">): void {
    console.info(formatMessage("info", module, message, options));
  },
};
