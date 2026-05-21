# Changelog — Phase 3: Sistema de Roles y Permisos

> Completed: 2026-05-21

## New Files

### Database
- `supabase/migrations/012_roles_permissions.sql` — `roles`, `permissions`, `role_permissions` tables; `home_members.role_id` FK; seed data; backward compat UPDATE; RLS policies
- `supabase/seed/roles.sql` — idempotent seed for 5 system roles
- `supabase/seed/permissions.sql` — idempotent seed for 13 permission keys
- `supabase/seed/role_permissions.sql` — idempotent seed for role→permission mappings

### Actions
- `src/lib/actions/roles.ts` — `assignRole()`, `getRolesWithPermissions()`

### UI — Roles Panel
- `src/app/(app)/settings/roles/page.tsx` — Owner-only page; redirects non-owners to `/`
- `src/app/(app)/settings/roles/_components/RolesPanel.tsx` — member role assignment UI + permissions reference

### Tests
- `tests/roles/role-permissions.test.ts` — 22 tests covering all 5 roles, hasAnyPermission, hasAllPermissions, unauthorized action scenarios

### Documentation
- `docs/roles-system.md`
- `docs/permissions-list.md`
- `docs/authorization-flow.md`
- `docs/changelog-phase3.md`
- `docs/phase3-report.md`

## Modified Files

### Types
- `src/lib/context/context.types.ts` — `membership.role` changed from `string | null` to `{ id: string; name: string } | null`
- `src/types/database.ts` — added `HomeMemberWithRoleAndPermissions`, `MemberWithRole`

### Context
- `src/lib/context/context.service.ts` — new query includes `roles(id, name, role_permissions(permissions(key)))`; permissions loaded from DB instead of hardcoded

### Security
- `src/lib/security/permissions.ts` — expanded from 5 to 13 `Permission` constants; updated `ROLE_PERMISSIONS` static map for 5 roles
- `src/lib/security/authorization.ts` — added `isAdmin()`, `hasAnyPermission()`, `hasAllPermissions()`, `canManageRoles()`, `canManageInvites()`; all domain functions now delegate to `hasPermission()` instead of `isOwner()`

### Server Actions — permission checks added
- `src/lib/actions/tasks.ts` — `create_task`, `edit_task`, `delete_task` guards
- `src/lib/actions/shopping.ts` — `create_shopping`, `edit_shopping` guards
- `src/lib/actions/finance.ts` — `edit_finances` guards on all 3 functions
- `src/lib/actions/contributions.ts` — `edit_finances` guards
- `src/lib/actions/savings.ts` — `edit_finances` guards on all 4 functions
- `src/lib/actions/home.ts` — migrated to `getCurrentContext()`; `manage_invites` guard on `inviteMember()` + `createInviteLink()`; `manage_members` guard replaces inline `created_by === user.id`; role assignment (`Owner` on createHome, `Member` on invite)

### UI
- `src/app/(app)/_components/InviteModal.tsx` — `isAdmin` → `canManageInvites` + `canManageMembers`; invite button conditionally rendered
- `src/app/(app)/_components/DashboardContent.tsx` — `isAdmin` → `canManageInvites` + `canManageMembers`
- `src/app/(app)/page.tsx` — uses `getCurrentContext()` directly; derives `canManageInvites` + `canManageMembers` from `ctx.permissions`
- `src/app/(app)/ranking/page.tsx` — uses `getCurrentContext()`; `isAdmin = permissions.includes("manage_gamification")`

### Tests updated
- `tests/context/context.test.ts` — 4 tests (was 3); updated mocks to return role+permission data; assertions use new `role: { id, name }` shape
- `tests/permissions/authorization.test.ts` — 20 tests (was 13); updated `makeCtx` helper; added tests for `isAdmin`, `hasAnyPermission`, `hasAllPermissions`, `canManageRoles`, `canManageInvites`, updated `canEditFinance`
- `tests/integration/close-period.test.ts` — updated mocks to include `roles` with `manage_gamification` permission

## Technical Debt Eliminated

| Debt | Solution |
|------|---------|
| `home.created_by === user.id` inline in 3 actions | `canManageMembers(ctx)`, `canManageInvites(ctx)` |
| Hardcoded `["admin", "member"]` permission arrays | DB-backed `role_permissions` join |
| No server-side permission validation on CRUD actions | `hasPermission(ctx, Permission.X)` guards on all 8 action files |
| `isAdmin` boolean passed as prop (UI couldn't distinguish invite vs. manage) | `canManageInvites` + `canManageMembers` as separate flags |
