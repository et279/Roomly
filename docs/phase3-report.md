# Fase 3 — Reporte: Sistema de Roles y Permisos

> Completado: 2026-05-21

---

## Migraciones creadas

| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/012_roles_permissions.sql` | Tablas `roles`, `permissions`, `role_permissions`; columna `home_members.role_id`; seed de 5 roles y 13 permisos; UPDATE backward-compat; RLS policies |
| `supabase/seed/roles.sql` | Seed idempotente de roles |
| `supabase/seed/permissions.sql` | Seed idempotente de permisos |
| `supabase/seed/role_permissions.sql` | Seed idempotente del mapeo rol→permisos |

---

## Permisos implementados (13)

`manage_home` · `manage_members` · `manage_roles` · `manage_invites` · `create_task` · `edit_task` · `delete_task` · `view_finances` · `edit_finances` · `manage_gamification` · `view_ranking` · `create_shopping` · `edit_shopping`

---

## Roles implementados (5)

| Rol | Permisos | Backward compat |
|-----|----------|-----------------|
| Owner | Todos (13) | Asignado a creadores del hogar vía migration |
| Admin | 12 (sin manage_roles) | — |
| Adult | 6 | — |
| Member | 9 (preserva comportamiento actual) | Asignado a miembros no-creadores vía migration |
| Guest | 1 (view_ranking) | — |

---

## Módulos actualizados

### Backend (Server Actions)

| Archivo | Validaciones agregadas |
|---------|----------------------|
| `tasks.ts` | `create_task`, `edit_task`, `delete_task` |
| `shopping.ts` | `create_shopping`, `edit_shopping` |
| `finance.ts` | `edit_finances` (3 funciones) |
| `contributions.ts` | `edit_finances` (3 funciones) |
| `savings.ts` | `edit_finances` (4 funciones) |
| `home.ts` | `manage_invites` (invitar), `manage_members` (eliminar); asignación de roles Owner/Member |
| `gamification.ts` | `manage_gamification` (ya existía vía `canManageGamification`) |

### Frontend (UI)

| Componente | Cambio |
|-----------|--------|
| `InviteModal.tsx` | `isAdmin` → `canManageInvites` + `canManageMembers`; botón "Invitar" condicional |
| `DashboardContent.tsx` | `isAdmin` → `canManageInvites` + `canManageMembers` |
| `page.tsx` (dashboard) | Usa `getCurrentContext()`; elimina query duplicado a `home_members` |
| `ranking/page.tsx` | Usa `getCurrentContext()`; `isAdmin = permissions.includes("manage_gamification")` |
| `/settings/roles/page.tsx` | Nueva página Owner-only |
| `RolesPanel.tsx` | Selector de rol por miembro + tabla de permisos de referencia |

### Capa de seguridad

| Archivo | Cambios |
|---------|---------|
| `context.types.ts` | `membership.role: string \| null` → `{ id, name } \| null` |
| `context.service.ts` | Query con join `roles(id,name,role_permissions(permissions(key)))` |
| `permissions.ts` | 5 → 13 constantes; `ROLE_PERMISSIONS` para los 5 roles |
| `authorization.ts` | +5 funciones: `isAdmin`, `hasAnyPermission`, `hasAllPermissions`, `canManageRoles`, `canManageInvites` |

---

## Tests agregados

```
100 tests pasados / 100 tests totales
10 archivos de test

tests/security/logger.test.ts                   6/6  ✓
tests/security/task-ownership.test.ts          10/10 ✓
tests/integration/period-score.test.ts          2/2  ✓
tests/integration/close-period.test.ts          3/3  ✓
tests/context/context.test.ts                   4/4  ✓  (+1 test)
tests/permissions/authorization.test.ts        20/20 ✓  (+7 tests)
tests/services/task-service.test.ts             4/4  ✓
tests/services/finance-service.test.ts          7/7  ✓
tests/services/gamification-service.test.ts     3/3  ✓
tests/roles/role-permissions.test.ts           22/22 ✓  (nuevo)
```

---

## Riesgos restantes (no abordados en Fase 3)

| ID | Descripción | Estado |
|----|-------------|--------|
| KI-001 | 1 usuario = 1 hogar | Pendiente Fase 4: Multi-hogar |
| KI-008 | Invitaciones sin email real | Pendiente: integración SMTP |
| KI-010 | Invite link sin soporte multi-hogar | Bloqueado por KI-001 |
| KI-012 | `seedDefaultCategories` en cada visita | Fix simple pendiente |
| KI-016 | Tipos generados de Supabase | `supabase gen types typescript` pendiente |
| KI-019 | Invitaciones sin expiración | Seguridad menor |
| KI-020 | `avatar_url` sin UI | Feature pendiente |
| KI-021 | Join link (`/join/[token]`) no asigna rol al unirse | Role assignment pendiente cuando se implemente la ruta |
| KI-022 | Roles personalizados no implementados | `is_system = false` reservado para Fase 4 |

---

## Preparación para Fase 4

### Multi-hogar
- `getCurrentContext()` con `role_id` por membership permite que cada hogar tenga roles independientes por miembro
- El selector de hogar solo necesita cambiar `maybeSingle()` → query del hogar activo

### Roles personalizados
- Tabla `roles` acepta `is_system = false` para roles creados por el usuario
- El panel `/settings/roles` solo muestra roles del sistema por ahora; ampliar con CRUD de roles es aditivo

### Auditoría
- Agregar `updated_at` y `updated_by` a `home_members` para trazar cambios de rol

### Notificaciones push
- `eventBus` (Fase 2) ya emite `MEMBER_JOINED` — agregar handler que envíe notificación con el rol asignado
