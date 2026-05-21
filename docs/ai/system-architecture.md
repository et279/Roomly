# System Architecture — Roomly
> Referencia para asistentes de IA. Última actualización: 2026-05-20

---

## ¿Qué es Roomly?

Aplicación móvil-first (Capacitor + Next.js PWA) para la gestión colaborativa de hogares compartidos. Permite a los miembros de un hogar coordinar tareas, lista de compras, finanzas y un sistema de gamificación con rankings y logros.

---

## Stack completo

```
┌─────────────────────────────────────────┐
│           Cliente (Mobile/Web)           │
│  Next.js 15 App Router + React 19        │
│  Capacitor 8 (Android wrapper)           │
│  Framer Motion · Zustand · Tailwind 4    │
└────────────────────┬────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────┐
│         Next.js Server (Vercel)          │
│   Server Components + Server Actions    │
│   Route Handlers (join/token, confirm)  │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│              Supabase                    │
│  PostgreSQL · Auth · RLS · Realtime*    │
│  (*Realtime no implementado aún)         │
└─────────────────────────────────────────┘
```

---

## Flujo de datos

### Lectura (Server Components)
```
Page (async Server Component)
  → await createClient()          ← client con cookies del user
  → supabase.auth.getUser()       ← verifica sesión
  → createAdminClient()           ← bypasea RLS para queries
  → .from("tabla").select(...)    ← lee datos
  → <ClientComponent data={...} /> ← pasa datos como props
```

### Escritura (Server Actions)
```
<form action={serverAction}>
  → serverAction("use server")
  → createClient() → getUser()    ← verifica sesión
  → createAdminClient()           ← bypasea RLS
  → .from("tabla").insert(...)    ← escribe datos
  → revalidatePath("/ruta")       ← invalida cache de Next.js
```

---

## Módulos del sistema

### Autenticación
- **Archivos:** `src/lib/actions/auth.ts`, `src/app/(auth)/`, `src/app/auth/confirm/route.ts`
- **Responsabilidad:** Sign up/in/out, password recovery, actualización de perfil
- **Dependencias:** Supabase Auth, Zod validation

### Hogares
- **Archivos:** `src/lib/actions/home.ts`, `src/app/(onboarding)/`
- **Responsabilidad:** Creación de hogares, gestión de membresías, invitaciones
- **Dependencias:** `home_members`, `homes`, `invite_links`, `invitations`

### Tareas
- **Archivos:** `src/lib/actions/tasks.ts`, `src/app/(app)/tasks/`
- **Responsabilidad:** CRUD de tareas, recurrencia, tracking de completado
- **Dependencias:** `tasks`, gamificación (fire-and-forget)

### Compras
- **Archivos:** `src/lib/actions/shopping.ts`, `src/app/(app)/shopping/`
- **Responsabilidad:** Lista de compras compartida
- **Dependencias:** `shopping_items`, gamificación (fire-and-forget)

### Finanzas
- **Archivos:** `src/lib/actions/finance.ts`, `categories.ts`, `contributions.ts`, `savings.ts`
- **Responsabilidad:** Registros financieros, cuotas, metas de ahorro, métricas
- **Dependencias:** `financial_records`, `expense_categories`, `house_contributions`, `saving_goals`

### Gamificación
- **Archivos:** `src/lib/actions/gamification.ts`
- **Responsabilidad:** Puntos, logros, períodos de ranking, encuesta de premios
- **Dependencias:** Todas las tablas de gamificación (007, 008)

---

## Convenciones de nombres en la DB

| Prefijo/patrón | Significado |
|----------------|-------------|
| `home_*` | Pertenece a un hogar (ej: `home_members`, `home_gamification_settings`) |
| `*_id` | Clave foránea (ej: `home_id`, `user_id`, `period_id`) |
| `created_by` | UUID del usuario creador |
| `status` | Campo de estado con enum restringido vía CHECK |
| `updated_at` | Timestamp de última modificación (manual, sin trigger) |
| `period_*` | Relacionado con períodos de ranking |
| `prize_poll_*` | Encuesta de premios del ranking |

---

## Modelo de autorización

### Niveles de acceso
1. **No autenticado:** Solo puede visitar `/login`, `/register`, `/forgot-password`, `/join/[token]`
2. **Autenticado sin hogar:** Redirigido a `/create-home` por el AppLayout
3. **Miembro del hogar:** Acceso completo a tareas, compras, finanzas, ranking de su hogar
4. **Admin del hogar:** Igual que miembro + puede configurar ranking, eliminar miembros, cerrar períodos

### Detección de admin
```ts
// Patrón usado en toda la app:
const isAdmin = homes.created_by === user.id;
```

### Guards de acceso
- **AppLayout** (`src/app/(app)/layout.tsx`): Verifica auth + membership
- **Server Actions:** Cada action llama `getUserAndHome()` que verifica auth
- **RLS de Supabase:** Segunda línea de defensa (parcialmente incompleta — ver database-report.md)

---

## Invariantes del sistema

1. **1 usuario = 1 hogar** (actualmente). Toda la lógica asume `.single()` en `home_members`.
2. **El admin es inmutable.** `homes.created_by` nunca cambia después de la creación.
3. **Los períodos de ranking se auto-crean** al primer evento de gamificación si no existe uno activo.
4. **Los puntos se acumulan de forma optimista** (fire-and-forget) y nunca se restan.
5. **RLS deshabilitada de facto** para server-side: toda escritura usa admin client.

---

## Flujo de invite link (token-based)

```
Admin genera token (crypto.randomUUID())
        ↓
Token guardado en invite_links con expires_at = now() + 7 días
        ↓
Link: /join/[token]
        ↓
Usuario visita el link
        ↓
        ├── Si está logueado y sin hogar → se une al hogar → redirect /
        ├── Si está logueado con hogar  → redirect / (sin unirse, silencioso)
        └── Si no está logueado         → cookie "roomly_invite" = token
                                                 → redirect /register
                                                 → al completar registro, se une al hogar
```

---

## Flujo de gamificación

```
Evento (tarea/compra/cuota)
        ↓
award*Points(userId, homeId, ...)  [fire-and-forget]
        ↓
getOrCreateActivePeriod(homeId)
        ↓
        ├── Si disabled → retorna null (no puntuar)
        └── Si enabled  → busca período activo
                         ├── Existe → usa ese período
                         └── No existe → crea nuevo período
        ↓
upsertPeriodScore(periodId, homeId, userId, {points})
        ↓
checkAndAwardAchievements(userId, homeId, periodId)
        ↓
        ├── Cuenta tareas/compras/cuotas/períodos ganados
        ├── Compara con thresholds de achievements
        └── Inserta en member_achievements los nuevos logros
```
