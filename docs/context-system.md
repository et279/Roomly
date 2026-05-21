# Context System

## Overview

The context system centralizes user identity and home membership resolution. Every server action and data fetch now calls `getCurrentContext()` instead of duplicating the auth + membership query.

## Files

| File | Purpose |
|------|---------|
| `src/lib/context/context.types.ts` | `AppContext` interface |
| `src/lib/context/context.service.ts` | `getCurrentContext()` implementation |
| `src/lib/context/context.ts` | Re-exports for clean imports |

## AppContext Interface

```ts
interface AppContext {
  user: { id: string; email: string };
  home: { id: string; name: string };
  membership: { id: string; role: string | null };
  permissions: string[];
}
```

## ServerContext

Actions receive `ServerContext = AppContext & { admin: AdminClient }`. The admin client is included so actions don't need to instantiate a second one.

## Usage in Actions

```ts
// Before (Phase 1)
async function getUserAndHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: membership } = await admin.from("home_members")...single();
  return { user, homeId: membership?.home_id ?? null, admin };
}

// After (Phase 2)
const ctx = await getCurrentContext();
// ctx.user.id, ctx.home.id, ctx.admin all available
```

## Behavior

- Redirects to `/login` if the user is not authenticated.
- Redirects to `/create-home` if the user has no home membership.
- Returns `role: "admin"` when `homes.created_by === user.id`, otherwise `role: null`.

## Permissions

`permissions` is an array derived from `role`:
- Admin: `["admin", "member"]`
- Member: `["member"]`

When roles are implemented (Phase 3), this array will be populated from the roles table.
