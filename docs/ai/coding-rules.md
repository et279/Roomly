# Coding Rules — Roomly
> Convenciones y restricciones para desarrollar en este proyecto.
> Última actualización: 2026-05-20

---

## Reglas generales

### 1. No modificar código sin que el usuario lo pida explícitamente
Solo auditar, proponer y esperar confirmación.

### 2. No crear archivos de documentación adicionales
A menos que el usuario lo solicite expresamente.

### 3. No hacer commits sin permiso del usuario
El usuario debe pedir explícitamente `git commit` antes de ejecutarlo.

---

## Arquitectura

### Server Components primero
- Los datos se cargan en Server Components (`async function PageName()`)
- Los Client Components reciben datos como props, no hacen fetching directo
- Los `"use client"` components solo para interactividad (animaciones, formularios con estado, modales)

### Server Actions para mutaciones
- Todas las mutaciones van en `src/lib/actions/`
- Siempre empezar con `"use server"` en el archivo
- Siempre verificar autenticación con `createClient()` + `supabase.auth.getUser()` primero
- Siempre terminar con `revalidatePath()` en las rutas afectadas

### Admin client — usar con cuidado
```ts
// CORRECTO: Server Action o Server Component
const admin = createAdminClient(); // bypasea RLS — solo en server

// NUNCA: en Client Components o Route Handlers accesibles desde browser sin auth check
```

### getUserAndHome — patrón estándar
Todos los Server Actions del dominio usan este helper. Si el usuario no tiene hogar, retorna `homeId: null`. **Siempre verificar** que `homeId` no sea null antes de usarlo.

```ts
const { user, homeId, admin } = await getUserAndHome();
if (!homeId) return { error: "No pertenecés a ningún hogar" };
```

---

## Validación

### Usar Zod en el boundary de entrada
Inputs de formularios deben validarse con Zod antes de llegar a la DB:
```ts
const schema = z.object({ name: z.string().min(2) });
const parsed = schema.safeParse({ name: formData.get("name") });
if (!parsed.success) return { error: "..." };
```

### No usar `includes("@")` para validar emails
Usar `z.email()` de Zod en su lugar.

---

## TypeScript

### No usar `as unknown as`
Si Supabase retorna un tipo que no coincide, usar tipado explícito en el select o crear un type helper. El patrón `as unknown as {...}` esconde errores en runtime.

**MAL:**
```ts
const homeData = (membership as unknown as { homes: {...} } | null)?.homes;
```

**BIEN:**
```ts
type MembershipWithHome = { home_id: string; homes: { name: string; created_by: string } };
const homeData = (membership as MembershipWithHome | null)?.homes;
```

### Tipos en `src/types/index.ts`
Todos los tipos del dominio van aquí. Los tipos de componentes locales pueden definirse en el mismo archivo del componente.

---

## Base de datos

### Naming conventions
- Tablas: `snake_case` plural (ej: `home_members`, `ranking_periods`)
- Columnas: `snake_case` (ej: `created_by`, `home_id`)
- Policies: string descriptivo en inglés (ej: `"Home members can read tasks"`)

### Nuevas tablas siempre incluyen
1. `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
2. `home_id uuid NOT NULL REFERENCES homes(id) ON DELETE CASCADE` (si aplica)
3. `created_at timestamptz NOT NULL DEFAULT now()`
4. RLS habilitado: `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY`
5. Políticas para SELECT, INSERT, UPDATE, DELETE según aplique

### Índices para columnas frecuentemente filtradas
Toda columna `home_id`, `user_id`, `period_id` usada en `.eq()` frecuente debe tener índice.

---

## UI y componentes

### Mobile-first
La app es mobile-first (Capacitor + PWA). El ancho máximo de contenido es `max-w-md`. Nunca usar layouts de múltiples columnas sin verificar en mobile.

### Bottom padding
El layout tiene `paddingBottom: "calc(7rem + env(safe-area-inset-bottom))"` para que el contenido no quede tapado por el BottomNav.

### Animaciones con Framer Motion
- Usar `framer-motion` para transiciones de entrada/salida
- Patrones usados: `staggerChildren`, `fadeUp`, `spring`
- No agregar animaciones complejas que afecten el tiempo de interactividad (LCP/FID)

### Colores y tema
- No hardcodear colores hex directamente en className
- Usar tokens de Tailwind (`bg-card`, `text-foreground`, `text-muted-foreground`, etc.)
- El tema dark/light se maneja vía `next-themes` con `ThemeProvider`

---

## Gamificación — reglas de negocio

| Evento | Puntos | Archivo |
|--------|--------|---------|
| Completar tarea | +10 | `gamification.ts` |
| Completar tarea antes del vencimiento | +5 extra | `gamification.ts` |
| Completar ítem de compras | +3 | `gamification.ts` |
| Pagar cuota completa | +25 | `gamification.ts` |
| Desbloquear logro | variable (15-300) | achievements catalog |

Los puntos se acumulan en `period_scores` por período activo. Los logros se acumulan en `member_achievements` y son permanentes (no se reinician entre períodos).

---

## Anti-patrones a evitar

### 1. Side effects durante el render
```ts
// MAL: setState durante render body
if (someState) {
  setSomeOtherState(...); // puede causar loop
}

// BIEN: usar useEffect
useEffect(() => {
  if (someState) setSomeOtherState(...);
}, [someState]);
```

### 2. Fire-and-forget sin log
```ts
// MAL: silenciar errores completamente
someAction().catch(() => {});

// MEJOR: al menos loguear
someAction().catch((e) => console.error("[gamification]", e));
```

### 3. Queries sin limit en el dashboard
```ts
// MAL: sin limit en tablas de crecimiento ilimitado
admin.from("tasks").select("...").eq("home_id", homeId)

// BIEN: limitar y paginar
admin.from("tasks").select("...").eq("home_id", homeId).limit(50)
```

### 4. Comparaciones inline de admin en componentes
```ts
// MAL: lógica de autorización en el componente
if (home.created_by === user.id) { ... }

// MEJOR: recibir `isAdmin` como prop desde el Server Component
<ComponenteAdmin isAdmin={isAdmin} />
```
