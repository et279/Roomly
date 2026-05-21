# Authorization Flow

## Request Lifecycle

```
Browser request
  │
  ├── Server Action called
  │     │
  │     ├── getCurrentContext()           ← auth + home + role + permissions from DB
  │     │     │
  │     │     └── home_members
  │     │           .select("id, home_id, homes(name,created_by), roles(id,name,role_permissions(permissions(key)))")
  │     │
  │     ├── hasPermission(ctx, Permission.X)
  │     │     └── ctx.permissions.includes(perm)
  │     │
  │     ├── return { error: "Sin permiso..." }   ← early exit if unauthorized
  │     │
  │     └── business logic + DB write
  │
  └── revalidatePath() → cache bust → UI re-renders
```

## Two-Layer Defense

Both layers must pass — never trust only the frontend.

```
Frontend (UI layer)
  canManageInvites → show/hide Invite button
  canManageMembers → show/hide Remove member button
  isAdmin (permissions.includes("manage_gamification")) → show/hide admin controls in Ranking

Backend (Action layer)
  hasPermission(ctx, Permission.MANAGE_INVITES) → return error or proceed
  canManageMembers(ctx) → return error or proceed
  canManageGamification(ctx) → return error or proceed
```

## AppContext Shape (Phase 3)

```ts
interface AppContext {
  user: { id: string; email: string };
  home: { id: string; name: string };
  membership: {
    id: string;
    role: { id: string; name: string } | null;  // from roles table
  };
  permissions: string[];  // from role_permissions → permissions join
}
```

## Permission Check Functions

```ts
// Primitive checks
hasPermission(ctx, "manage_home")          // exact key match
hasAnyPermission(ctx, ["a", "b"])          // OR logic
hasAllPermissions(ctx, ["a", "b"])         // AND logic

// Role checks
isOwner(ctx)   // role.name === "Owner"
isAdmin(ctx)   // role.name in ["Owner", "Admin"]

// Domain helpers (all delegate to hasPermission)
canManageHome(ctx)
canManageMembers(ctx)
canManageRoles(ctx)
canManageInvites(ctx)
canManageGamification(ctx)
canEditFinance(ctx)
```

## Adding a New Permission

1. Add key to `Permission` constant in `permissions.ts`
2. Add row to `permissions` table (or re-run `supabase/seed/permissions.sql`)
3. Assign it to the appropriate roles in `role_permissions` table (or update seed)
4. Call `hasPermission(ctx, Permission.NEW_KEY)` in the action
5. Optionally hide related UI based on the permission
