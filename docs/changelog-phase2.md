# Changelog — Phase 2: Structural Refactoring

> Completed: 2026-05-21

## New Files

### Context Layer
- `src/lib/context/context.types.ts` — `AppContext` interface
- `src/lib/context/context.service.ts` — `getCurrentContext()` → auth + membership + permissions
- `src/lib/context/context.ts` — re-exports

### Types
- `src/types/database.ts` — explicit join result types replacing `as unknown as` casts:
  - `HomeMemberWithHome`, `HomeMemberWithHomeName`, `HomeMemberWithHomeFull`, `MemberWithProfile`, `ScoreWithProfile`

### Security
- `src/lib/security/permissions.ts` — `Permission` constants + `ROLE_PERMISSIONS` map
- `src/lib/security/authorization.ts` — `isOwner()`, `hasPermission()`, `canManageHome()`, `canManageMembers()`, `canManageGamification()`, `canEditFinance()`

### Services
- `src/lib/services/GamificationService.ts` — extracted from gamification.ts: award functions + internal helpers
- `src/lib/services/TaskService.ts` — `completeTask()`, `uncompleteTask()`
- `src/lib/services/ShoppingService.ts` — `toggleShoppingItem()`
- `src/lib/services/FinanceService.ts` — `resolveContributionStatus()`, `applyContributionPayment()`
- `src/lib/services/HomeService.ts` — `getCurrentHome()`

### Events
- `src/lib/events/event.types.ts` — typed event payloads: `TaskCompletedPayload`, `ShoppingCompletedPayload`, `ContributionPaidPayload`, `GoalReachedPayload`, `MemberJoinedPayload`
- `src/lib/events/eventBus.ts` — typed event bus with `on()`, `off()`, `emit()`

### Tests
- `tests/context/context.test.ts` — 3 tests for `getCurrentContext()`
- `tests/permissions/authorization.test.ts` — 13 tests for all authorization functions
- `tests/services/task-service.test.ts` — 4 tests for `completeTask()` and `uncompleteTask()`
- `tests/services/finance-service.test.ts` — 7 tests for `resolveContributionStatus()` and `applyContributionPayment()`
- `tests/services/gamification-service.test.ts` — 3 tests for award functions

## Modified Files

### Actions — now use `getCurrentContext()` instead of local `getUserAndHome()`
- `src/lib/actions/tasks.ts` — uses `getCurrentContext()` + `TaskService`
- `src/lib/actions/shopping.ts` — uses `getCurrentContext()` + `ShoppingService`
- `src/lib/actions/finance.ts` — uses `getCurrentContext()`
- `src/lib/actions/contributions.ts` — uses `getCurrentContext()` + `FinanceService`
- `src/lib/actions/savings.ts` — uses `getCurrentContext()`
- `src/lib/actions/gamification.ts` — uses `getCurrentContext()` + `canManageGamification()` + GamificationService; re-exports award functions; `select("*")` → specific columns
- `src/lib/actions/home.ts` — uses `HomeService`

### Pages — `as unknown as` replaced with typed casts from `database.ts`
- `src/app/(app)/page.tsx` — uses `HomeMemberWithHome`
- `src/app/(app)/ranking/page.tsx` — uses `HomeMemberWithHome`, `MemberWithProfile`
- `src/app/(app)/shopping/page.tsx` — typed `ShoppingItemRow` inline
- `src/app/(app)/profile/page.tsx` — uses `HomeMemberWithHomeName`

### Other
- `src/lib/supabase/admin.ts` — exports `AdminClient` type
- `tests/integration/close-period.test.ts` — updated mock for `getCurrentContext()` home_members query

## Technical Debt Eliminated

| Debt | Resolution |
|------|-----------|
| `getUserAndHome()` defined 5× across action files | Single `getCurrentContext()` |
| `home.created_by === user.id` scattered inline | `canManageGamification(ctx)` etc. |
| `select("*")` fetching all achievement columns | Explicit column list |
| `as unknown as` in 6 locations | Named types from `database.ts` |
| Business logic mixed into action functions | Extracted to service layer |
| No typed event infrastructure | `eventBus` + `AppEventPayloadMap` |
