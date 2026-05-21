# Functional Report — Roomly
> Auditoría: 2026-05-20 | Módulos revisados: Auth, Home, Tasks, Shopping, Finance, Gamificación, Invitaciones

---

## Módulos funcionales

### 1. Autenticación (`src/lib/actions/auth.ts`)

**Estado:** Funcional y completo

**Flujos implementados:**
- Sign up con email/password + confirmación de email
- Sign in con email/password
- Forgot password → email con link
- Reset password desde link
- Cambio de nombre y contraseña desde perfil
- Sign out

**Hallazgos:**

#### [ALTO] Invitaciones por email no envían email real
`inviteMember()` en `src/lib/actions/home.ts` solo inserta en la tabla `invitations`. No hay ninguna llamada a un servicio de email (SendGrid, Resend, Supabase email, etc.). El usuario invitado nunca se entera de la invitación a menos que se registre con el mismo email y el trigger de Supabase lo conecte al hogar.

#### [MEDIO] Validación de email en `inviteMember` es débil
```ts
// src/lib/actions/home.ts:53
if (!email || !email.includes("@")) {
```
La validación de auth.ts usa Zod (`z.email()`), pero home.ts usa una comparación de string básica. Debería unificarse.

#### [BAJO] Error de sign-up expone si el email ya existe
Supabase retorna errores específicos de "user already exists". El código actual propaga `error.message` directamente al cliente, lo que puede usarse para enumerar emails registrados.

---

### 2. Hogares e Invitaciones (`src/lib/actions/home.ts`, `src/app/join/[token]/route.ts`)

**Estado:** Funcional con limitaciones arquitecturales importantes

**Flujos implementados:**
- Crear hogar
- Invitar por email (sin email real)
- Generar link de invitación (token UUID, expira 7 días)
- Compartir por WhatsApp / copiar al portapapeles
- Unirse por link (autenticado o con cookie)
- Eliminar miembro (solo admin)
- Ver miembros del hogar

**Hallazgos:**

#### [CRÍTICO] Usuario con hogar existente no puede unirse a otro
```ts
// src/app/join/[token]/route.ts:41
if (!existingMember || existingMember.length === 0) {
  await admin.from("home_members").insert(...)
}
return NextResponse.redirect(`${origin}/`);
```
Si un usuario ya pertenece a un hogar, el link de invitación los redirige al home sin unirse al nuevo hogar y sin ningún mensaje de error. Este comportamiento es silencioso y confuso.

#### [ALTO] No hay límite de invite links por hogar
Un miembro malicioso puede crear ilimitados invite links válidos, llenando la tabla `invite_links`. No hay rate limiting ni límite de links activos por hogar.

#### [ALTO] Admin no puede transferir la propiedad del hogar
No existe mecanismo para que el creador original (`homes.created_by`) transfiera el rol de admin a otro miembro. Si el creador abandona el hogar, el hogar queda sin admin permanentemente.

#### [MEDIO] Eliminar miembro no elimina sus datos personales
Al hacer `removeMember`, el usuario se elimina de `home_members` pero sus `financial_records`, `house_contributions` y datos de gamificación quedan en la DB vinculados al hogar. Los `ON DELETE CASCADE` solo aplican cuando se borra el usuario de `auth.users`, no cuando se le remueve del hogar. El UI informa esto ("se conserva su historial") pero puede ser un problema de privacidad.

---

### 3. Tareas (`src/lib/actions/tasks.ts`, `src/app/(app)/tasks/`)

**Estado:** Funcional y completo

**Flujos implementados:**
- Crear tarea (título, asignado, fecha límite, recurrencia)
- Marcar como hecha (toggle)
- Editar asignado, fecha, recurrencia
- Eliminar tarea
- Recurrencia automática (daily, weekly, biweekly, monthly)
- Tracking de quién completó y cuándo

**Hallazgos:**

#### [ALTO] Toggle de tarea no verifica que el usuario pertenezca al hogar de la tarea
```ts
// src/lib/actions/tasks.ts:73
export async function toggleTask(id: string, done: boolean) {
  const { user, admin } = await getUserAndHome();
  await admin.from("tasks").update({...}).eq("id", id);
```
La función obtiene el hogar del usuario y actualiza la tarea por ID, pero no verifica que el task.home_id coincida con el homeId del usuario. Un usuario podría, con el ID correcto, marcar tareas de otro hogar (posible si hay bug en la UI o llamada directa).

#### [MEDIO] Tareas completadas sin deshacer en el dashboard
El dashboard tiene optimistic UI que marca tareas como completadas y las deja tachadas hasta el reload. No hay botón para deshacer desde el dashboard (aunque sí en `/tasks`).

#### [BAJO] Recurrencia no respeta si la tarea fue completada tarde
`nextDueDate()` siempre parte de `task.due_date` (no de la fecha actual de completado). Si una tarea semanal se completa 2 días tarde, la próxima ocurrencia se genera a 7 días del vencimiento original, no de la fecha de completado. Puede ser intencional pero es confuso.

---

### 4. Compras (`src/lib/actions/shopping.ts`, `src/app/(app)/shopping/`)

**Estado:** Funcional y simple

**Flujos implementados:**
- Agregar ítem (título, cantidad)
- Marcar como comprado (toggle)
- Eliminar ítem
- Otorgar puntos de gamificación al completar

**Hallazgos:**

#### [MEDIO] No hay estado de "carritos" o categorías en compras
Todos los ítems comparten una lista plana. Para hogares con muchos miembros comprando simultáneamente, no hay forma de organizar o filtrar.

#### [BAJO] `createShoppingItem` retorna `{ error: null }` en éxito, no `{ success: true }`
```ts
// src/lib/actions/shopping.ts:46
return { error: null };
```
Inconsistencia con el resto de actions que retornan `{ success: true }`. Puede causar confusión al manejar el estado en componentes.

---

### 5. Finanzas (`src/lib/actions/finance.ts`, `categories.ts`, `contributions.ts`, `savings.ts`)

**Estado:** Funcional y completo para MVP

**Flujos implementados:**
- Registrar ingresos, gastos, ahorros, transferencias, ajustes
- Categorías personalizadas por hogar (con seeding de defaults)
- Cuotas mensuales con estados (pending, partial, paid, overdue)
- Metas de ahorro compartidas con progreso
- Dashboard con métricas del mes actual

**Hallazgos:**

#### [ALTO] `updateFinancialRecord` no valida que el usuario sea el owner del registro
```ts
// src/lib/actions/finance.ts:57-74
export async function updateFinancialRecord(id: string, updates: {...}) {
  const { admin } = await getUserAndHome();
  await admin.from("financial_records").update({...}).eq("id", id);
```
La función no verifica que `financial_records.user_id === user.id`. Cualquier miembro del hogar con el ID del registro puede editarlo. La RLS policy de `UPDATE` sí restringe a `user_id = auth.uid()`, pero como se usa el admin client, la RLS no aplica.

Lo mismo aplica para `deleteFinancialRecord`, `deleteContribution`, `deleteSavingGoal`, `updateSavingGoal`.

#### [ALTO] `updateContributionPayment` permite actualizar cuotas de otros usuarios
```ts
// src/lib/actions/contributions.ts:64
export async function updateContributionPayment(id: string, paidAmount: number) {
  const { admin } = await getUserAndHome();
```
No verifica que la cuota pertenezca al homeId del usuario. Solo verifica que el usuario esté en algún hogar.

#### [MEDIO] `addToSavingGoal` no tiene límite superior
`current_amount` puede exceder `target_amount` si se agregan montos sin validación. El UI calcula `pct = Math.min(100, ...)` para la barra de progreso, pero el dato en DB puede ser mayor al target.

#### [MEDIO] Finanzas solo muestra datos del mes actual
El dashboard de finanzas filtra por mes actual hardcodeado. No hay vista de meses anteriores excepto en la lista de Records sin filtro de fecha. El historial financiero completo no es accesible desde el dashboard.

#### [BAJO] `seedDefaultCategories` no es idempotente si se cambian las categorías default
```ts
// src/lib/actions/categories.ts (no leído directamente)
```
Si un dev cambia las categorías default en código, los hogares existentes no reciben las nuevas. Y el check de "si ya tiene categorías no hacer nada" impide agregar nuevas defaults a hogares que ya tienen algunas.

---

### 6. Gamificación y Ranking (`src/lib/actions/gamification.ts`)

**Estado:** Funcional con bugs potenciales de concurrencia e integridad

**Flujos implementados:**
- Configurar gamificación (admin): activar/desactivar, tipo de período
- Auto-creación de períodos de ranking
- Acumulación de puntos por tareas, compras, finanzas
- Logros con progreso y desbloqueo automático
- Cierre de período con asignación de rankings finales
- Encuesta de premios con votación optimista

**Hallazgos:**

#### [CRÍTICO] `closePeriod` no es atómica

`closePeriod()` en `gamification.ts:329`:
1. Lee scores
2. Actualiza `final_rank` de cada score en un `Promise.all` con calls separadas
3. Otorga logro al ganador
4. Procesa votos de encuesta
5. Actualiza estado del período a "closed"

Si cualquier paso intermedio falla, el período puede quedar en estado parcialmente cerrado (algunos ranks asignados, otros no, período aún "active"). No hay rollback.

#### [ALTO] Admin del hogar puede cerrar períodos aunque no haya scores
Si se cierra un período con 0 participantes, la lógica de ranking asigna `final_rank` vacío y el período queda cerrado sin ningún ganador, sin error.

#### [ALTO] `getOrCreateActivePeriod` crea períodos usando `home.created_by` como `created_by` del período
```ts
// src/lib/actions/gamification.ts:82-90
const { data: home } = await admin.from("homes").select("created_by").eq("id", homeId).single();
```
El período auto-creado tiene `created_by = home.created_by` (el admin), aunque el trigger lo haya lanzado otro usuario al completar una tarea. Lógicamente es correcto (el admin "configuró" el sistema), pero puede ser confuso en el historial.

#### [MEDIO] Logros se evalúan en CADA completado de tarea/compra/cuota
`checkAndAwardAchievements` hace 4 queries count a la DB y evalúa todos los achievements. Esto ocurre en cada toggle de tarea. Para hogares activos con muchos logros, es un costo significativo.

**Optimización:** Mantener los counters en una tabla separada y solo re-evaluar el achievement específico que podría haberse alcanzado.

#### [MEDIO] Encuesta de premios permite edición después de que hay votos
Un admin puede editar las opciones de la encuesta en cualquier momento, lo que borra todos los votos sin confirmación adicional. El UI avisa ("los votos anteriores se reinician") pero no pide confirmación explícita.

#### [BAJO] El ranking de período activo no persiste `final_rank` hasta cierre
Durante el período activo, la columna `final_rank` en `period_scores` es `null`. Si un usuario visita el ranking, ve el orden por `total_points`. Pero si hay empate, el orden es no determinístico (depende del orden de inserción de la DB).

---

### 7. Perfil de usuario

**Estado:** Funcional pero limitado

**Flujos implementados:**
- Cambiar nombre
- Cambiar contraseña
- Ver información básica del perfil

**Hallazgos:**

#### [MEDIO] No hay opción de eliminar cuenta
No existe un flujo de "eliminar mi cuenta" desde el perfil. Esto puede ser un requisito legal (GDPR, Ley 25.326 en Argentina).

#### [BAJO] `avatar_url` existe en DB pero no en UI
El campo existe en la tabla `profiles` pero no hay upload de avatar implementado.

---

## Resumen de estado de módulos

| Módulo | Estado | Bloqueantes |
|--------|--------|-------------|
| Auth | ✅ Completo | Ninguno |
| Hogares | ⚠️ Limitado | No multi-hogar |
| Invitaciones | ⚠️ Limitado | Email no enviado |
| Tareas | ✅ Completo | Validación owner parcial |
| Compras | ✅ Completo | — |
| Finanzas | ⚠️ Limitado | Validación owner falta en admin bypass |
| Gamificación | ⚠️ Bugs | Race condition, closePeriod no atómica |
| Ranking | ⚠️ Limitado | — |
| Logros | ✅ Completo | — |
| Perfil | ⚠️ Limitado | Sin eliminar cuenta |
