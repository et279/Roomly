# Database Report — Roomly
> Auditoría: 2026-05-20 | Migrations revisadas: 001–008

---

## Esquema actual — tablas

| Tabla | Migration | Descripción |
|-------|-----------|-------------|
| `profiles` | 001 | Perfil de usuario, auto-creado vía trigger |
| `homes` | 001 | Hogares |
| `home_members` | 001 | Membresías usuario-hogar (N:M) |
| `invitations` | 001 | Invitaciones por email |
| `tasks` | 002 | Tareas del hogar |
| `shopping_items` | 002 | Lista de compras |
| `invite_links` | 003 | Links de invitación tokenizados |
| `expense_categories` | 006 | Categorías de gasto por hogar |
| `financial_records` | 006 | Registro de ingresos/gastos/ahorros |
| `house_contributions` | 006 | Cuotas mensuales de miembros |
| `saving_goals` | 006 | Metas de ahorro compartidas |
| `achievements` | 007 | Catálogo global de logros |
| `member_achievements` | 007 | Logros obtenidos por miembro/hogar |
| `home_gamification_settings` | 007 | Config de gamificación por hogar |
| `ranking_periods` | 007 | Períodos de ranking |
| `ranking_prizes` | 007 | Premios por período/posición |
| `period_scores` | 007 | Puntajes por período/usuario |
| `prize_poll_options` | 008 | Opciones de la encuesta de premios |
| `prize_poll_votes` | 008 | Votos de la encuesta |

---

## Hallazgos por prioridad

---

### [CRÍTICO] Tablas `prize_poll_options` y `prize_poll_votes` — sin políticas de escritura

**Archivo:** `supabase/migrations/008_prize_poll.sql`

Las dos tablas del prize poll solo tienen políticas `SELECT`. No hay políticas `INSERT`, `UPDATE`, ni `DELETE`. Las escrituras funcionan actualmente porque la app usa `createAdminClient()` que bypasea RLS, pero si cualquier lógica migrara al cliente (o si alguien llama a Supabase directamente), cualquier usuario autenticado podría:
- Crear opciones para períodos de otros hogares
- Votar en encuestas de hogares ajenos
- Borrar opciones de otros

**Acciones faltantes:**
```sql
-- prize_poll_options: solo el admin del hogar puede insertar/eliminar
CREATE POLICY "prize_poll_options_insert" ON prize_poll_options
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
    AND period_id IN (SELECT id FROM ranking_periods WHERE status = 'active')
  );

-- prize_poll_votes: miembros del hogar pueden votar (upsert)
CREATE POLICY "prize_poll_votes_insert" ON prize_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    home_id IN (SELECT home_id FROM home_members WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );
```

---

### [CRÍTICO] Tablas de gamificación — sin políticas de escritura

**Archivo:** `supabase/migrations/007_gamification.sql`

Las siguientes tablas solo tienen políticas `SELECT`:
- `member_achievements`
- `home_gamification_settings`
- `ranking_periods`
- `ranking_prizes`
- `period_scores`

Sin políticas de escritura, cualquier usuario autenticado podría manipular puntajes, logros y configuración de ranking si llama a Supabase directamente con el anon key.

---

### [ALTO] `home_members` — política INSERT excesivamente permisiva

**Archivo:** `supabase/migrations/001_initial.sql:90-93`

```sql
create policy "Authenticated users can insert home members"
  on public.home_members for insert
  with check (auth.role() = 'authenticated');
```

Cualquier usuario autenticado puede agregar a cualquier persona a cualquier hogar con una llamada directa a la API de Supabase. La política no verifica que el usuario que inserta sea miembro del hogar destino.

**Fix recomendado:**
```sql
-- Reemplazar por:
create policy "Home members can add members"
  on public.home_members for insert
  with check (
    home_id IN (
      SELECT home_id FROM public.home_members WHERE user_id = auth.uid()
    )
  );
```

---

### [ALTO] Ausencia de índices en tablas de alto tráfico

Las tablas más consultadas no tienen índices explícitos en las columnas de filtro más frecuentes:

| Tabla | Columna sin índice | Impacto |
|-------|-------------------|---------|
| `tasks` | `home_id`, `done`, `completed_by` | Queries del dashboard y achievements |
| `shopping_items` | `home_id`, `done`, `completed_by` | Queries de compras y achievements |
| `home_members` | `user_id` | Usado en casi todas las pages |
| `invite_links` | `token` | Único pero se busca por token, no por PK |
| `member_achievements` | `home_id, user_id` | Usado en achievements check |
| `period_scores` | `home_id, user_id` | Usado en leaderboard |

`006_finances.sql` sí tiene índices correctos para sus tablas. El mismo patrón debería aplicarse retroactivamente a las tablas de `001` y `002`.

**Índices recomendados:**
```sql
CREATE INDEX IF NOT EXISTS idx_tasks_home_done ON tasks(home_id, done);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_by ON tasks(home_id, completed_by);
CREATE INDEX IF NOT EXISTS idx_shopping_home_done ON shopping_items(home_id, done);
CREATE INDEX IF NOT EXISTS idx_shopping_completed_by ON shopping_items(home_id, completed_by);
CREATE INDEX IF NOT EXISTS idx_home_members_user ON home_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS idx_member_achievements_user ON member_achievements(home_id, user_id);
CREATE INDEX IF NOT EXISTS idx_period_scores_user ON period_scores(home_id, user_id);
```

---

### [ALTO] Sin transacción en `upsertPeriodScore` — race condition de puntajes

**Afecta:** Integridad de datos en `period_scores`

El flujo actual es:
1. `SELECT` puntos actuales
2. Calcular nuevo total en código
3. `UPSERT` con el nuevo total

Entre los pasos 1 y 3, otra request concurrente puede leer el mismo valor, resultando en puntos perdidos (last-write-wins). Esto es especialmente probable si dos miembros completan tareas simultáneamente.

**Fix recomendado:** Usar una función RPC PostgreSQL con `FOR UPDATE` o usar `UPDATE ... SET tasks_points = tasks_points + $delta`.

---

### [ALTO] `invitations` no expiran

**Archivo:** `supabase/migrations/001_initial.sql:28-35`

La tabla `invitations` no tiene columna `expires_at`. Una invitación por email creada hace meses permanece activa indefinidamente. El nuevo miembro puede registrarse con ese email en cualquier momento futuro y automáticamente unirse al hogar.

---

### [MEDIO] Sin triggers `updated_at` automáticos

Las columnas `updated_at` en `financial_records`, `house_contributions`, `saving_goals`, `home_gamification_settings` deben actualizarse manualmente en el código de la aplicación. Si se agrega un endpoint o action que olvida incluir `updated_at: new Date().toISOString()`, el campo queda desactualizado silenciosamente.

**Fix recomendado:** Trigger genérico:
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### [MEDIO] `tasks` no tiene `recurrence` en la migration inicial — parchado en 005

La tabla `tasks` fue creada en `002_shopping_metrics.sql` sin la columna `recurrence`. Se agregó después en `005_recurring_tasks.sql`. Este patrón de parcheo incremental sin una schema migración consolidada hace que el estado inicial de la DB sea difícil de reproducir en entornos nuevos sin aplicar todas las migrations en orden.

No es un bug, pero es deuda técnica que complica onboarding de nuevos devs.

---

### [MEDIO] `home_members` no tiene columna `role`

La membresía solo registra `home_id`, `user_id` y `joined_at`. No hay columna para roles futuros. Agregar roles requerirá una migration + actualización de todas las RLS policies + refactor de múltiples Server Actions.

---

### [BAJO] `profiles.avatar_url` definida pero sin uso en UI

La columna `avatar_url` existe en `profiles` pero ninguna parte de la UI la muestra o permite modificarla. El espacio en perfiles usa la primera letra del nombre como avatar. Esto no es un bug sino una feature pendiente.

---

### [BAJO] `achievements` es un catálogo global sin versionado

La tabla `achievements` es un catálogo global (sin `home_id`). Si se quiere dar a un hogar un catálogo personalizado o agregar nuevos logros sin afectar hogares existentes que no los tienen, la estructura actual no lo soporta.

---

## Resumen de cobertura RLS

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | ✅ | — (trigger) | ✅ | — |
| homes | ✅ | ✅ | — | — |
| home_members | ✅ | ⚠️ permisivo | — | — |
| invitations | ✅ | ✅ | ⚠️ cualquier auth | — |
| tasks | ✅ | ✅ | ✅ | ✅ |
| shopping_items | ✅ | — | — | — |
| invite_links | ✅ | ✅ | — | — |
| expense_categories | ✅ | ✅ | ✅ | ✅ |
| financial_records | ✅ | ✅ | ✅ (solo owner) | ✅ (solo owner) |
| house_contributions | ✅ | ✅ | ✅ | ✅ |
| saving_goals | ✅ | ✅ | ✅ | ✅ |
| achievements | ✅ | — | — | — |
| member_achievements | ✅ | ❌ falta | — | — |
| home_gamification_settings | ✅ | ❌ falta | — | — |
| ranking_periods | ✅ | ❌ falta | — | — |
| ranking_prizes | ✅ | ❌ falta | — | — |
| period_scores | ✅ | ❌ falta | — | — |
| prize_poll_options | ✅ | ❌ falta | — | ❌ falta |
| prize_poll_votes | ✅ | ❌ falta | — | — |

**Leyenda:** ✅ presente | ❌ falta | ⚠️ presente pero con problema | — no aplica / delegado a app
