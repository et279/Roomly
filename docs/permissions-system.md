# Permissions System

## Overview

The authorization layer centralizes permission checks that were previously scattered as inline `home.created_by === user.id` comparisons.

## Files

| File | Purpose |
|------|---------|
| `src/lib/security/permissions.ts` | Permission constants and role→permission map |
| `src/lib/security/authorization.ts` | Check functions that take an `AppContext` |

## Permission Constants

```ts
Permission.MANAGE_HOME        // Create/edit/delete home settings
Permission.MANAGE_MEMBERS     // Add/remove home members
Permission.MANAGE_GAMIFICATION // Configure ranking, prizes, periods
Permission.EDIT_FINANCE       // Create/update/delete financial records
Permission.VIEW_MEMBERS       // See member list (all home members)
```

## Check Functions

```ts
isOwner(ctx)               // ctx.membership.role === "admin"
hasPermission(ctx, perm)   // ctx.permissions.includes(perm)
canManageHome(ctx)         // admin only
canManageMembers(ctx)      // admin only
canManageGamification(ctx) // admin only
canEditFinance(ctx)        // all home members (always true)
```

## Before / After

```ts
// Before
if (home.created_by !== user.id) return { error: "..." };

// After
if (!canManageGamification(ctx)) return { error: "..." };
```

## Phase 3 Readiness

When Roles are implemented, only `isOwner()` and `hasPermission()` need to change. All callers (`canManageHome`, `canManageGamification`, etc.) remain the same.
