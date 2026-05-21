# Project Glossary — Roomly
> Diccionario de términos del dominio. Última actualización: 2026-05-20

---

## Entidades del dominio

### Home (Hogar)
Un espacio compartido con nombre, creado por un usuario. Cada hogar tiene un `created_by` que es el "admin". Actualmente un usuario solo puede pertenecer a **un hogar**.

**Tabla:** `homes`
**Campos clave:** `id`, `name`, `created_by`

---

### Home Member (Miembro del hogar)
Relación N:M entre usuarios y hogares. Representa que un usuario pertenece a un hogar.

**Tabla:** `home_members`
**Campos clave:** `home_id`, `user_id`, `joined_at`

---

### Profile (Perfil)
Extensión del usuario de Supabase Auth. Se crea automáticamente vía trigger al registrarse. Contiene nombre, email y avatar (no implementado en UI).

**Tabla:** `profiles`
**Campos clave:** `id` (= auth.users.id), `name`, `email`, `avatar_url`

---

### Admin
El creador del hogar (`homes.created_by === user.id`). No hay tabla de roles — el admin es siempre el fundador del hogar. Puede: configurar ranking, eliminar miembros, cerrar períodos.

**No tiene tabla propia.** Es una propiedad derivada de `homes.created_by`.

---

### Invitation (Invitación por email)
Sistema de invitación donde se guarda el email del invitado. Si el usuario se registra con ese email, se une automáticamente al hogar. **No envía email real** — es solo un registro en DB.

**Tabla:** `invitations`
**Estados:** `pending`, `accepted`

---

### Invite Link (Link de invitación)
URL con token UUID válido por 7 días que permite a cualquier persona unirse al hogar. Se puede compartir por WhatsApp u otros canales. Implementado como token en cookie para el flow de registro.

**Tabla:** `invite_links`
**Campos clave:** `token`, `expires_at`

---

### Task (Tarea)
Una actividad del hogar que puede ser asignada a un miembro, tener fecha límite y recurrencia. Al completarse, genera puntos de gamificación.

**Tabla:** `tasks`
**Estados clave:** `done: boolean`
**Recurrencia:** `daily | weekly | biweekly | monthly | null`
**Tracking:** `completed_by`, `completed_at`

---

### Shopping Item (Ítem de compras)
Un producto en la lista de compras compartida del hogar. Al marcarse como comprado, genera puntos.

**Tabla:** `shopping_items`
**Estados:** `done: boolean`
**Tracking:** `completed_by`

---

### Expense Category (Categoría de gasto)
Categorías personalizadas por hogar para clasificar registros financieros. Tienen nombre, icono y color. Se crean categorías default al primer acceso a Finanzas.

**Tabla:** `expense_categories`
**Campos clave:** `name`, `icon`, `color`, `home_id`

---

### Financial Record (Registro financiero)
Transacción financiera del hogar. Puede ser ingreso, gasto, ahorro, transferencia o ajuste.

**Tabla:** `financial_records`
**Tipos:** `income | expense | saving | transfer | adjustment`
**Campos clave:** `type`, `amount`, `date`, `category_id`, `user_id`

---

### House Contribution (Cuota del hogar)
Aporte mensual que cada miembro debe pagar. Tiene un monto objetivo, monto pagado real y estado calculado automáticamente.

**Tabla:** `house_contributions`
**Estados:** `pending → partial → paid | overdue`
**Lógica de estado:** `resolveStatus(amount, paidAmount, dueDate)`

---

### Saving Goal (Meta de ahorro)
Meta de ahorro compartida entre todos los miembros. Tiene un monto objetivo, monto actual y deadline opcional.

**Tabla:** `saving_goals`
**Campos clave:** `target_amount`, `current_amount`, `deadline`

---

### Achievement (Logro)
Un hito que un miembro puede desbloquear al superar ciertos umbrales de actividad. El catálogo es global (no por hogar). Una vez obtenido, el logro es permanente.

**Tabla:** `achievements` (catálogo global)
**Tabla:** `member_achievements` (logros obtenidos por usuario/hogar)
**Condition types:** `tasks_completed | shopping_done | contributions_paid | periods_won`

---

### Gamification Settings (Config de gamificación)
Configuración de gamificación por hogar. Determina si el ranking está activo y el tipo de período.

**Tabla:** `home_gamification_settings`
**Campos clave:** `enabled`, `period_type`
**Period types:** `monthly | biweekly`

---

### Ranking Period (Período de ranking)
Ventana de tiempo en la que se acumulan puntos. Se crea automáticamente al primer evento de gamificación. Al cerrarlo, se asignan `final_rank` a los scores.

**Tabla:** `ranking_periods`
**Estados:** `active | closed`
**Auto-creación:** al primer `awardTaskPoints/ShoppingPoints/FinancePoints` si no hay período activo

---

### Period Score (Puntaje del período)
Acumulado de puntos de un usuario en un período específico. Se compone de puntos de tareas, compras, finanzas y logros.

**Tabla:** `period_scores`
**Campos clave:** `tasks_points`, `shopping_points`, `finance_points`, `achievement_points`, `total_points`, `final_rank`

---

### Ranking Prize (Premio del ranking)
Premio asignado a cada posición (rank 1, 2, 3) de un período. Los define el admin del hogar.

**Tabla:** `ranking_prizes`
**Campos clave:** `period_id`, `rank`, `prize_description`

---

### Prize Poll (Encuesta de premios)
Sistema de votación donde los miembros votan por qué debería ser el premio del 1er puesto. La opción más votada se aplica automáticamente al cerrar el período.

**Tablas:** `prize_poll_options`, `prize_poll_votes`
**Restricción:** 1 voto por usuario por período (`UNIQUE(period_id, user_id)`)
**Comportamiento:** Los votos se borran si el admin edita las opciones

---

## Términos técnicos del proyecto

### getUserAndHome()
Helper de Server Actions que verifica auth y retorna `{ user, homeId, admin }`. Si el usuario no tiene sesión, redirige a `/login`. Retorna `homeId: null` si no tiene hogar.

### Admin Client
`createAdminClient()` — cliente Supabase con service role key que bypasea RLS completamente. Solo debe usarse en server-side (Server Actions, Route Handlers).

### Regular Client
`createClient()` — cliente Supabase con anon key + cookies de sesión. Respeta RLS. Se usa para verificar auth.

### AppLayout
Layout en `src/app/(app)/layout.tsx` que protege toda la zona de la app. Verifica sesión y membresía antes de renderizar hijos.

### Fire-and-forget
Patrón `someAction().catch(() => {})` usado para puntos de gamificación. La llamada no bloquea el flujo principal pero los errores son silenciados.

### Seed Categories
`seedDefaultCategories(homeId)` — función que crea categorías default para un hogar si no tiene ninguna. Se llama en cada visita a `/finance`.

### revalidatePath
Función de Next.js que invalida el cache del servidor para una ruta, forzando un nuevo fetch en la próxima visita.
