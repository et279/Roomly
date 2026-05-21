# Fase 2 — Reporte de Refactorización Estructural
> Completado: 2026-05-21

---

## Archivos creados

### Context
| Archivo | Propósito |
|---------|-----------|
| `src/lib/context/context.types.ts` | Interfaz `AppContext` con user, home, membership, permissions |
| `src/lib/context/context.service.ts` | `getCurrentContext()` → auth + home join + permisos |
| `src/lib/context/context.ts` | Re-exports |

### Tipos
| Archivo | Propósito |
|---------|-----------|
| `src/types/database.ts` | Tipos explícitos para joins de Supabase: `HomeMemberWithHome`, `MemberWithProfile`, etc. |

### Seguridad
| Archivo | Propósito |
|---------|-----------|
| `src/lib/security/permissions.ts` | Constantes `Permission` + mapa `ROLE_PERMISSIONS` |
| `src/lib/security/authorization.ts` | `isOwner()`, `hasPermission()`, `canManageHome()`, `canManageGamification()`, `canEditFinance()`, `canManageMembers()` |

### Servicios
| Archivo | Propósito |
|---------|-----------|
| `src/lib/services/GamificationService.ts` | Lógica de award points, períodos y logros (extraída de gamification.ts) |
| `src/lib/services/TaskService.ts` | `completeTask()` (DB + gamification + recurrencia), `uncompleteTask()` |
| `src/lib/services/ShoppingService.ts` | `toggleShoppingItem()` (DB + gamification) |
| `src/lib/services/FinanceService.ts` | `resolveContributionStatus()` (pura), `applyContributionPayment()` |
| `src/lib/services/HomeService.ts` | `getCurrentHome()` |

### Eventos
| Archivo | Propósito |
|---------|-----------|
| `src/lib/events/event.types.ts` | Tipos: `TASK_COMPLETED`, `SHOPPING_COMPLETED`, `CONTRIBUTION_PAID`, `GOAL_REACHED`, `MEMBER_JOINED` |
| `src/lib/events/eventBus.ts` | Bus de eventos tipado: `on()`, `off()`, `emit()` |

### Tests
| Archivo | Tests |
|---------|-------|
| `tests/context/context.test.ts` | 3 — `getCurrentContext()`: admin role, member role, redirect on no-home |
| `tests/permissions/authorization.test.ts` | 13 — todas las funciones de autorización |
| `tests/services/task-service.test.ts` | 4 — `completeTask()` con/sin recurrencia, `uncompleteTask()` |
| `tests/services/finance-service.test.ts` | 7 — `resolveContributionStatus()` (6 casos) + `applyContributionPayment()` |
| `tests/services/gamification-service.test.ts` | 3 — award points: base, bonus, creación de período |

### Documentación
| Archivo | Contenido |
|---------|-----------|
| `docs/context-system.md` | Arquitectura y uso del sistema de contexto |
| `docs/permissions-system.md` | Constantes de permisos y funciones de autorización |
| `docs/services-architecture.md` | Separación actions/services con ejemplos |
| `docs/changelog-phase2.md` | Lista completa de cambios |

---

## Archivos modificados

### Actions — `getUserAndHome()` → `getCurrentContext()`
| Archivo | Cambios |
|---------|---------|
| `src/lib/actions/tasks.ts` | `getCurrentContext()` + `completeTask()` / `uncompleteTask()` del TaskService |
| `src/lib/actions/shopping.ts` | `getCurrentContext()` + `toggleShoppingItem` del ShoppingService |
| `src/lib/actions/finance.ts` | `getCurrentContext()` |
| `src/lib/actions/contributions.ts` | `getCurrentContext()` + `applyContributionPayment()` del FinanceService |
| `src/lib/actions/savings.ts` | `getCurrentContext()` |
| `src/lib/actions/gamification.ts` | `getCurrentContext()` + `canManageGamification()`; re-exports award functions desde GamificationService; `select("*")` → columnas específicas |
| `src/lib/actions/home.ts` | Re-exporta `getCurrentHome` desde HomeService |

### Pages — eliminado `as unknown as`
| Archivo | Fix |
|---------|-----|
| `src/app/(app)/page.tsx` | `as HomeMemberWithHome` (desde database.ts) |
| `src/app/(app)/ranking/page.tsx` | `as HomeMemberWithHome`, `MemberWithProfile[]` |
| `src/app/(app)/shopping/page.tsx` | `ShoppingItemRow` inline, cast eliminado |
| `src/app/(app)/profile/page.tsx` | `as HomeMemberWithHomeName` |

### Otros
| Archivo | Cambios |
|---------|---------|
| `src/lib/supabase/admin.ts` | Exporta `AdminClient` type |
| `tests/integration/close-period.test.ts` | Mock actualizado: `home_members` devuelve datos para `getCurrentContext()` |

---

## Deuda técnica eliminada

| Deuda | Solución |
|-------|---------|
| `getUserAndHome()` duplicado en 5 archivos de actions | `getCurrentContext()` centralizado |
| `home.created_by === user.id` disperso inline en 3 lugares | `canManageGamification(ctx)`, `canManageHome(ctx)` |
| `select("*")` para achievements (traía columnas no usadas) | Columnas específicas: `id, key, name, description, icon, category, points, condition_type, condition_value` |
| `as unknown as` en 6 ubicaciones | Tipos nombrados en `src/types/database.ts` |
| Lógica de negocio mezclada en actions | Capa de servicios separada |
| Sin infraestructura de eventos | `eventBus` tipado con payload map |
| `AdminClient` type redefinido localmente en cada archivo | Exportado una vez desde `src/lib/supabase/admin.ts` |

---

## Tests

```
51 tests pasados / 51 tests totales
9 archivos de test

tests/security/logger.test.ts                  6/6  ✓
tests/security/task-ownership.test.ts         10/10 ✓
tests/integration/period-score.test.ts         2/2  ✓
tests/integration/close-period.test.ts         3/3  ✓
tests/context/context.test.ts                  3/3  ✓
tests/permissions/authorization.test.ts       13/13 ✓
tests/services/task-service.test.ts            4/4  ✓
tests/services/finance-service.test.ts         7/7  ✓
tests/services/gamification-service.test.ts    3/3  ✓
```

---

## Riesgos restantes (no abordados en Fase 2)

| ID | Descripción | Estado |
|----|-------------|--------|
| KI-001 | 1 usuario = 1 hogar | Pendiente Fase 3: Multi-hogar |
| KI-008 | Invitaciones sin email real | Pendiente: integración SMTP |
| KI-010 | Invite link sin soporte multi-hogar | Bloqueado por KI-001 |
| KI-012 | `seedDefaultCategories` en cada visita | Fix simple pendiente |
| KI-016 | Tipos generados de Supabase | `supabase gen types typescript` pendiente |
| KI-019 | Invitaciones sin expiración | Seguridad menor |
| KI-020 | `avatar_url` sin UI | Feature pendiente |

---

## Preparación para Fase 3

La arquitectura de Fase 2 habilita directamente:

### Roles funcionales
- `AppContext.membership.role` ya existe con valor `"admin" | null`
- `ROLE_PERMISSIONS` en permissions.ts está listo para agregar granularidad
- Todas las check functions (`canManageHome`, etc.) ya usan `ctx.membership.role` — no requieren cambios en callers
- Solo hay que poblar `role` desde la DB cuando se implementen roles en la tabla `home_members`

### Multi-hogar
- `getCurrentContext()` hace un join sobre `home_members` — cambiar a múltiples homes solo requiere modificar este servicio
- `AppContext.home` es un objeto, no un string flat — soporta switching natural
- Actions usan `ctx.home.id` uniformemente — un home selector puede setear el home activo en el contexto sin cambiar cada action

### Notificaciones push
- `eventBus` ya tiene los eventos: `TASK_COMPLETED`, `SHOPPING_COMPLETED`, `CONTRIBUTION_PAID`, `GOAL_REACHED`, `MEMBER_JOINED`
- Solo hay que registrar handlers en `eventBus.on(...)` que llamen al servicio de push notifications
- Los servicios (TaskService, ShoppingService, FinanceService) ya emiten los eventos semánticamente correctos via las funciones de award — solo hay que agregar `eventBus.emit(...)` calls cuando se active el feature

### Tipos generados de Supabase
- `src/types/database.ts` centraliza todos los casts — cuando `supabase gen types typescript` sea ejecutado, estos tipos serán reemplazados por los generados automáticamente sin impactar ningún otro código
