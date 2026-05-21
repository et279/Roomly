# Development Workflow — Roomly
> Proceso de trabajo para nuevas features y fixes. Última actualización: 2026-05-20

---

## Stack de desarrollo

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # Build de producción
```

### Mobile (Capacitor)
```bash
npm run cap:sync     # Sincroniza Next.js build con Android
npm run cap:open     # Abre Android Studio
npm run cap:build:apk    # APK de debug
npm run cap:build:release # APK de release
```

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=         # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key (pública, segura)
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (PRIVADA — solo server)
NEXT_PUBLIC_SITE_URL=             # URL base del sitio (para emails de auth)
```

**Importante:** `SUPABASE_SERVICE_ROLE_KEY` nunca debe ser expuesto al cliente. Está en `admin.ts` que solo se importa en server-side code.

---

## Proceso para agregar una nueva feature

### Paso 1: Diseño de base de datos
1. Crear nueva migration en `supabase/migrations/00N_nombre.sql`
2. Definir tablas con `IF NOT EXISTS`
3. Habilitar RLS: `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY`
4. Agregar políticas SELECT (mínimo), INSERT, UPDATE, DELETE según aplique
5. Agregar índices para columnas de filtro frecuente
6. Aplicar en Supabase: ejecutar el SQL en el editor de Supabase

### Paso 2: Tipos TypeScript
1. Agregar tipos nuevos en `src/types/index.ts`
2. Nombrar consistentemente: `NombreEntidad`, `NombreEntidadWithRelacion`

### Paso 3: Server Actions
1. Crear o modificar archivo en `src/lib/actions/`
2. Empezar con `"use server"`
3. Seguir el patrón de `getUserAndHome()` para verificar auth
4. Validar inputs con Zod si vienen de FormData
5. Usar `admin` (no `supabase`) para queries
6. Llamar `revalidatePath()` al final de cada mutación

### Paso 4: Server Component (página)
1. Verificar sesión con `createClient()` + `getUser()`
2. Verificar membership con `admin`
3. Cargar datos necesarios (preferir `Promise.all` para queries paralelas)
4. Pasar datos como props al Client Component

### Paso 5: Client Component
1. Marcar con `"use client"` solo si necesita interactividad
2. Usar `useActionState` para formularios con Server Actions
3. Usar `useTransition` para mutaciones sin form (botones, toggles)
4. UI optimista para mejor UX (ej: toggle de tarea)

---

## Proceso para corregir un bug

1. Identificar el archivo y línea exacta
2. Entender si el fix requiere cambio en DB (migration nueva) o solo en código
3. Si la migration es destructiva, consultar al usuario antes
4. Hacer el fix mínimo — no refactorizar código adyacente
5. Verificar que `revalidatePath` invalide las rutas correctas

---

## Guía para implementar múltiples hogares (planificación futura)

> Esta es la feature de mayor impacto en la arquitectura actual.

### Cambios requeridos en DB
- Agregar columna `role` a `home_members` (enum: `admin | member`)
- Actualizar `homes.created_by` behavior (o mantener como referencia de admin original)
- Todas las RLS policies ya tienen `home_id` — no cambiar

### Cambios requeridos en código
1. **`getUserAndHome()`** — cambiar de `.single()` a query con homeId del contexto actual
2. **URL structure** — agregar `/homes/[homeId]/` como prefijo de rutas (o usar homeId en context)
3. **AppLayout** — manejar selección de hogar activo (cookies o URL)
4. **Stores de Zustand** — el `house.store.ts` existe pero no está conectado. Este es el lugar natural para guardar el homeId activo
5. **Invite flow** — permitir que usuarios con hogar puedan unirse a otro (remover la restricción de `existingMember`)
6. **Dashboard** — mostrar selector de hogar activo

### Cambios requeridos en DB para roles
```sql
ALTER TABLE home_members ADD COLUMN role text NOT NULL DEFAULT 'member'
  CHECK (role IN ('admin', 'member'));

-- Migrar datos existentes: el created_by de cada hogar pasa a ser 'admin'
UPDATE home_members hm
  SET role = 'admin'
  FROM homes h
  WHERE h.id = hm.home_id AND h.created_by = hm.user_id;
```

---

## Guía para implementar sistema de roles (planificación futura)

### Roles propuestos
- `admin`: Configuración completa del hogar, eliminar miembros, ranking
- `member`: Operaciones normales (tareas, compras, finanzas)
- `viewer`: Solo lectura (futuro)

### Implementación recomendada
1. Agregar `role` a `home_members` (ver arriba)
2. Crear helper centralizado:
```ts
// src/lib/auth/roles.ts
async function getUserRole(admin: AdminClient, userId: string, homeId: string) {
  const { data } = await admin
    .from("home_members")
    .select("role")
    .eq("user_id", userId)
    .eq("home_id", homeId)
    .single();
  return data?.role ?? null;
}
```
3. Reemplazar todos los `homeData.created_by === user.id` por `getUserRole() === "admin"`
4. Actualizar RLS policies para usar el rol en lugar de `created_by`

---

## Supabase — operaciones comunes

### Aplicar una migration nueva
1. Copiar SQL al editor de Supabase > SQL Editor
2. Ejecutar
3. Verificar en Table Editor que la tabla/columna/policy existe

### Ver logs de auth
Dashboard Supabase > Authentication > Logs

### Ver queries lentas
Dashboard Supabase > Database > Query Performance

### Reset de contraseña de usuario (manual)
Dashboard Supabase > Authentication > Users > [usuario] > Reset password
