# Services Architecture

## Separation of Concerns

```
Actions (src/lib/actions/)
  ├── Validate input
  ├── Call getCurrentContext() → auth + permissions
  ├── Ownership verification (inline .eq("home_id", homeId))
  ├── Call service → business logic
  └── revalidatePath() → cache invalidation

Services (src/lib/services/)
  ├── Business logic
  ├── DB writes
  ├── Calculations
  └── Side effects (gamification, events)
```

## Service Inventory

### GamificationService

Internal helpers + public award functions. All actions that award points call through this service.

| Export | Called from |
|--------|------------|
| `awardTaskPoints(userId, homeId, dueDate, completedAt)` | TaskService (fire-and-forget) |
| `awardShoppingPoints(userId, homeId)` | ShoppingService (fire-and-forget) |
| `awardFinancePoints(userId, homeId)` | FinanceService (fire-and-forget) |
| `checkAndAwardAchievements(admin, userId, homeId, periodId)` | gamification.ts (after closePeriod) |
| `getOrCreateActivePeriod(admin, homeId)` | gamification.ts (startPeriod) |

### TaskService

| Export | Responsibility |
|--------|---------------|
| `completeTask(admin, taskId, userId, task)` | Mark done + fire gamification + schedule recurrence |
| `uncompleteTask(admin, taskId)` | Mark undone, clear completed fields |

### ShoppingService

| Export | Responsibility |
|--------|---------------|
| `toggleShoppingItem(admin, itemId, done, userId, homeId)` | Toggle done + fire gamification |

### FinanceService

| Export | Responsibility |
|--------|---------------|
| `resolveContributionStatus(amount, paidAmount, dueDate)` | Pure: compute contribution status |
| `applyContributionPayment(admin, id, contribution, paidAmount)` | Update DB + fire gamification if paid |

### HomeService

| Export | Responsibility |
|--------|---------------|
| `getCurrentHome(userId)` | Fetch home info for a user |

## Example: toggleTask Before/After

```ts
// Before (Phase 1): all logic in the action
export async function toggleTask(id: string, done: boolean) {
  const { user, homeId, admin } = await getUserAndHome();
  if (!homeId) return;
  const { data: task } = await admin.from("tasks").select(...).eq("id", id).eq("home_id", homeId).single();
  if (!task) return;
  await admin.from("tasks").update({ done, completed_by: ..., completed_at: ... }).eq("id", id);
  if (done) {
    awardTaskPoints(...).catch(...);
    if (task.recurrence) { await admin.from("tasks").insert(...); }
  }
  revalidatePath("/tasks");
}

// After (Phase 2): action is thin, service has logic
export async function toggleTask(id: string, done: boolean) {
  const ctx = await getCurrentContext();
  const { data: task } = await ctx.admin.from("tasks").select(...).eq("id", id).eq("home_id", ctx.home.id).single();
  if (!task) return;
  if (done) {
    await completeTask(ctx.admin, id, ctx.user.id, task); // service handles points + recurrence
  } else {
    await uncompleteTask(ctx.admin, id);
  }
  revalidatePath("/tasks");
}
```
