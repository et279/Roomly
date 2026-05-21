# Architecture Report — Roomly
> Auditoría: 2026-05-20 | Estado: sin modificar código

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 15.x |
| Runtime | React | 19.x |
| Base de datos | Supabase (PostgreSQL) | SDK 2.x |
| Auth | Supabase Auth | — |
| Estado cliente | Zustand | 5.x |
| Animaciones | Framer Motion | 12.x |
| UI components | shadcn/ui (parcial) + Radix | — |
| Estilos | Tailwind CSS | 4.x |
| Validación | Zod | 4.x |
| Mobile | Capacitor (Android) | 8.x |
| TypeScript | — | 6.x |

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (app)/           # Zona protegida (layout verifica auth + home)
│   │   ├── _components/ # Componentes compartidos del layout
│   │   ├── page.tsx     # Dashboard
│   │   ├── tasks/
│   │   ├── shopping/
│   │   ├── finance/     # Subpáginas: records, contributions, savings, categories
│   │   ├── ranking/
│   │   ├── achievements/
│   │   └── profile/
│   ├── (auth)/          # Login, register, forgot-password, reset-password
│   ├── (onboarding)/    # create-home, invite
│   ├── auth/confirm/    # Route handler OAuth/magic link
│   └── join/[token]/    # Route handler para invite links
├── lib/
│   ├── actions/         # Server Actions (mutations)
│   └── supabase/        # client.ts | server.ts | admin.ts
├── components/ui/       # Primitivos UI (Button, Input, Card, etc.)
├── stores/              # Zustand: auth.store | house.store
├── types/               # index.ts — todos los tipos del dominio
└── utils/               # format.ts
```

---

## Patrones arquitecturales usados

### 1. Server Components + Server Actions
Toda la carga de datos se hace en Server Components (RSC). Las mutaciones van por Server Actions (`"use server"`). Los Client Components reciben los datos como props y llaman Server Actions para escribir.

### 2. Admin client en Server Actions
Casi la totalidad de las operaciones de escritura y lectura de datos usan `createAdminClient()` (service role key), que bypasea RLS completamente. Solo la verificación de sesión usa el client regular (`createClient()`).

### 3. Stores Zustand — apenas utilizados
`auth.store.ts` y `house.store.ts` están definidos pero **nunca se populan ni consumen** desde las páginas actuales. Son vestigios de una arquitectura anterior. El estado se pasa 100% por props desde Server Components.

### 4. Modelo de autorización implícito
No existe tabla de roles. El "admin" de un hogar es exclusivamente quien lo creó (`homes.created_by === user.id`). Esta comparación se repite en múltiples lugares (layouts, actions, componentes).

---

## Hallazgos por prioridad

---

### [CRÍTICO] Asunción de 1 usuario = 1 hogar en toda la arquitectura

**Archivos afectados:** `src/lib/actions/tasks.ts:12`, `src/lib/actions/shopping.ts:9`, `src/lib/actions/finance.ts:9`, `src/lib/actions/contributions.ts:9`, `src/lib/actions/savings.ts:9`, `src/lib/actions/gamification.ts:9`, `src/lib/actions/home.ts`

Todos los helpers `getUserAndHome()` usan `.single()` al consultar `home_members`. Si un usuario pertenece a más de un hogar, `.single()` lanza una excepción de Supabase (o retorna `null` si se usa `.maybeSingle()`). Esto hace que **implementar múltiples hogares sea un cambio breaking en toda la capa de actions**.

El join route (`src/app/join/[token]/route.ts:41`) también bloquea a usuarios con membresía previa de unirse a un segundo hogar.

**Impacto para implementar múltiples hogares:** ALTO — requiere rediseño de `getUserAndHome()`, scoping de URLs, y cambios en todas las páginas.

---

### [CRÍTICO] Sin sistema de roles — admin es solo `created_by`

**Archivos afectados:** `src/app/(app)/layout.tsx`, `src/lib/actions/gamification.ts:251-268`, `src/lib/actions/home.ts:149-157`

El rol de admin está esparcido en comparaciones directas sin abstracción. No existe tabla `roles` ni enum. Agregar roles como "moderador", "tesorero" o "solo lectura" requiere modificar múltiples capas simultáneamente.

**Impacto para implementar roles:** ALTO — necesita tabla de roles, helper centralizado, y actualización de RLS policies.

---

### [ALTO] Admin client bypass RLS total

**Archivo:** `src/lib/supabase/admin.ts`

El 95% de las operaciones de datos usan `createAdminClient()`. Si bien es correcto para Server Actions (ejecutan en server, no exponen el service key), el patrón impide que las RLS policies de Supabase tengan efecto real. Una regresión (ej. mover lógica al cliente) expondría todos los datos sin restricción.

Las tablas de gamificación (`007_gamification.sql`) y prize_poll (`008_prize_poll.sql`) solo tienen políticas SELECT — las escrituras dependen exclusivamente del admin client.

---

### [ALTO] Stores Zustand no conectados — deuda de arquitectura

**Archivos:** `src/stores/auth.store.ts`, `src/stores/house.store.ts`

Están definidos pero ningún componente los usa ni los hidrata. Presentan un riesgo cuando alguien asuma que son la fuente de verdad del usuario o el hogar actual. Deben eliminarse o conectarse.

---

### [ALTO] Race condition en `upsertPeriodScore`

**Archivo:** `src/lib/actions/gamification.ts:96-135`

El helper lee los puntos actuales y luego escribe el nuevo total en dos operaciones separadas (read → compute → write). Sin transacción o bloqueo, dos requests concurrentes para el mismo `(period_id, user_id)` pueden perder puntos (last-write-wins).

**Fix recomendado:** Usar un `UPDATE ... SET points = points + $delta` atómico en PostgreSQL, o una función RPC de Supabase.

---

### [ALTO] Fire-and-forget en puntos de gamificación sin observabilidad

**Archivos:** `src/lib/actions/tasks.ts:96`, `src/lib/actions/shopping.ts:65`, `src/lib/actions/contributions.ts:89`

```ts
awardTaskPoints(...).catch(() => {});
```

Los errores se silencian completamente. Si la gamificación falla (timeout, DB error), el usuario pierde puntos sin ningún log, alerta, ni retry. Imposible diagnosticar inconsistencias.

---

### [MEDIO] Dashboard carga TODAS las tareas sin paginación

**Archivo:** `src/app/(app)/page.tsx:42-55`

```ts
admin.from("tasks").select("...").eq("home_id", homeId).order("created_at", ...)
```

No hay `limit()`. Para hogares con historial largo, esto descarga cientos/miles de filas al servidor solo para filtrar en JS y mostrar 5.

---

### [MEDIO] `seedDefaultCategories` se ejecuta en cada render de `/finance`

**Archivo:** `src/app/(app)/finance/page.tsx:34`

`await seedDefaultCategories(homeId)` es una operación de escritura condicional que se llama **en cada visita** a la página de finanzas. Aunque internamente verifica si ya existen categorías, añade latencia innecesaria y carga sobre la DB.

---

### [MEDIO] Coerciones `as unknown as` encubren errores de tipo

**Archivos:** `src/app/(app)/page.tsx:27`, `src/app/(app)/ranking/page.tsx:26`, `src/lib/actions/home.ts:186`, `src/lib/actions/gamification.ts:258`

El patrón `as unknown as { ... }` indica que el tipado de los joins de Supabase no es correcto. Esto esconde errores en runtime si la estructura del join cambia.

---

### [MEDIO] N+1 queries en conteo de votos

**Archivo:** `src/lib/actions/gamification.ts:558-570`

```ts
const voteCounts = await Promise.all(
  pollOpts.map(opt => admin.from("prize_poll_votes")
    .select("*", { count: "exact", head: true })
    .eq("option_id", opt.id))
);
```

Una query por cada opción de la encuesta. Debería ser un `GROUP BY option_id COUNT(*)` en una sola query.

---

### [BAJO] `execCommand("copy")` deprecado

**Archivo:** `src/app/(app)/_components/InviteModal.tsx:57`

El fallback de clipboard usa `document.execCommand("copy")` que está deprecado y eliminado en algunos browsers modernos.

---

### [BAJO] Side effect durante render en InviteModal

**Archivo:** `src/app/(app)/_components/InviteModal.tsx:36-39`

```ts
if (emailState?.success && emailState.email && !invitedEmails.includes(emailState.email)) {
  setInvitedEmails((prev) => [...prev, emailState.email as string]);
}
```

Llamar a `setState` durante el render body (fuera de un efecto) puede causar loops de render en React 19 strict mode.

---

## Resumen de prioridades

| Prioridad | Cantidad | Áreas |
|-----------|----------|-------|
| CRÍTICO | 2 | Multi-hogar, Roles |
| ALTO | 5 | Admin bypass, Zustand, Race condition, Fire-forget, Paginación |
| MEDIO | 4 | seedCategories, tipos, N+1, queries dashboard |
| BAJO | 2 | execCommand, side effect render |
