import { vi } from "vitest";

// Minimal chainable Supabase query builder mock.
// Each method returns `this` so call chains like .select().eq().single() work.
// Override `resolveWith` before each test to control the resolved value.

export function createChainableMock(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};

  const methods = [
    "from", "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "or", "lte", "gte", "order", "limit",
    "maybeSingle",
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods that resolve the promise
  (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedValue);
  (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedValue);

  return chain;
}

// Creates a mock admin client that returns different values per table.
export function createTableMock(tableResults: Record<string, unknown>) {
  const admin = {
    from: vi.fn((table: string) => createChainableMock(tableResults[table] ?? { data: null, error: null })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return admin;
}
