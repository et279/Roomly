# Known Issues — Roomly
> Registro de bugs conocidos y limitaciones. Última actualización: 2026-05-20

---

## CRÍTICO

### KI-001: 1 usuario solo puede pertenecer a 1 hogar
**Módulo:** Hogares, todas las actions  
**Archivos:** `src/lib/actions/tasks.ts:12`, `shopping.ts:9`, `finance.ts:9`, y más  
**Síntoma:** `.single()` en `home_members` falla si hay múltiples membresías  
**Causa:** Diseño arquitectural — toda la lógica asume 1 user = 1 home  
**Impacto:** Implementar multi-hogar requiere refactor mayor  
**Workaround:** No implementado — limitación de diseño actual  

---

### KI-002: `prize_poll_options` y `prize_poll_votes` sin políticas RLS de escritura
**Módulo:** Gamificación — Prize Poll  
**Archivo:** `supabase/migrations/008_prize_poll.sql`  
**Síntoma:** Cualquier usuario autenticado con anon key puede insertar en estas tablas  
**Causa:** Solo se definieron políticas SELECT, falta INSERT/DELETE  
**Impacto:** Seguridad — si alguien llama a Supabase directamente puede votar por otros o crear opciones falsas  
**Workaround:** El admin client en Server Actions previene esto actualmente  

---

### KI-003: Tablas de gamificación (007) sin políticas RLS de escritura
**Módulo:** Gamificación  
**Archivo:** `supabase/migrations/007_gamification.sql`  
**Síntoma:** `member_achievements`, `ranking_periods`, `period_scores`, etc. sin INSERT/UPDATE policies  
**Causa:** Diseño original dependía 100% del admin client  
**Impacto:** Si la lógica migra al cliente, cualquier usuario puede manipular puntajes  
**Workaround:** Admin client en Server Actions previene esto actualmente  

---

## ALTO

### KI-004: Race condition en `upsertPeriodScore`
**Módulo:** Gamificación  
**Archivo:** `src/lib/actions/gamification.ts:96-135`  
**Síntoma:** En uso concurrente, puntos pueden perderse (last-write-wins)  
**Causa:** Read-then-write sin transacción o UPDATE atómico  
**Impacto:** Inconsistencia en puntajes bajo carga concurrente  
**Workaround:** Sin workaround — el problema ocurre silenciosamente  
**Fix sugerido:** `UPDATE period_scores SET tasks_points = tasks_points + $delta WHERE ...`  

---

### KI-005: `closePeriod` no es atómica — riesgo de estado inconsistente
**Módulo:** Gamificación — Ranking  
**Archivo:** `src/lib/actions/gamification.ts:329`  
**Síntoma:** Si falla a mitad del cierre, el período puede tener final_rank parciales y seguir "active"  
**Causa:** Múltiples operaciones separadas sin transacción  
**Impacto:** Períodos con estado corrupto en la DB  
**Workaround:** Cerrar el período manualmente desde Supabase SQL si queda en mal estado  

---

### KI-006: `toggleTask` y `toggleShoppingItem` no validan ownership del task/item
**Módulo:** Tareas, Compras  
**Archivo:** `src/lib/actions/tasks.ts:73`, `shopping.ts:49`  
**Síntoma:** Un usuario con el ID de una tarea puede marcarla como hecha aunque sea de otro hogar  
**Causa:** La query `.eq("id", id)` no filtra por `home_id`  
**Impacto:** Seguridad — posible manipulación de datos entre hogares  
**Workaround:** La RLS policy de UPDATE en `tasks` sí verifica home membership — pero se bypasea con admin client  

---

### KI-007: `updateFinancialRecord` y `deleteFinancialRecord` no verifican ownership
**Módulo:** Finanzas  
**Archivo:** `src/lib/actions/finance.ts:57-81`  
**Síntoma:** Cualquier miembro del hogar puede editar/borrar registros de otros  
**Causa:** Admin client bypasea la RLS que restringe a `user_id = auth.uid()`  
**Impacto:** Un miembro puede borrar transacciones de otro miembro del mismo hogar  
**Workaround:** Confianza en miembros del mismo hogar (aceptable para MVP familiar)  

---

### KI-008: Invitaciones por email no envían email real
**Módulo:** Invitaciones  
**Archivo:** `src/lib/actions/home.ts:51-98`  
**Síntoma:** Al invitar por email, la UI muestra éxito pero el invitado no recibe nada  
**Causa:** No hay integración con servicio de email  
**Impacto:** La feature de invitación por email es no funcional en producción  
**Workaround:** Usar los invite links (token-based) para compartir por WhatsApp  

---

### KI-009: `home_members` INSERT policy permite que cualquier usuario se auto-agregue a hogares
**Módulo:** Seguridad — DB  
**Archivo:** `supabase/migrations/001_initial.sql:90-93`  
**Síntoma:** Con el anon key, cualquier usuario autenticado puede agregar `home_members` con cualquier `home_id`  
**Causa:** Policy `with check (auth.role() = 'authenticated')` es demasiado permisiva  
**Impacto:** Seguridad — bypass del sistema de invitaciones  
**Workaround:** Admin client en Server Actions actualmente previene el path normal. La DB es vulnerable directamente.  

---

### KI-010: Usuario con hogar existente no puede unirse a otro hogar vía invite link
**Módulo:** Hogares  
**Archivo:** `src/app/join/[token]/route.ts:41`  
**Síntoma:** Si el usuario ya pertenece a un hogar, el invite link lo redirige al home sin mensaje de error ni acción  
**Causa:** Restricción de diseño (1 user = 1 home)  
**Impacto:** UX confusa — el usuario no sabe por qué el link "no funcionó"  
**Workaround:** Ninguno hasta implementar multi-hogar  

---

## MEDIO

### KI-011: Dashboard carga todas las tareas sin paginación
**Módulo:** Dashboard  
**Archivo:** `src/app/(app)/page.tsx:42-55`  
**Síntoma:** La página carga todas las tareas del hogar para mostrar solo 5  
**Causa:** Sin `limit()` en la query  
**Impacto:** Degradación de performance para hogares con historial largo  
**Workaround:** No hay workaround — impacto bajo en hogares pequeños (MVP)  

---

### KI-012: `seedDefaultCategories` se ejecuta en cada visita a /finance
**Módulo:** Finanzas  
**Archivo:** `src/app/(app)/finance/page.tsx:34`  
**Síntoma:** Query de write innecesaria en cada pageview de finanzas  
**Causa:** La función se llama incondicionalmente en el render  
**Impacto:** Latencia adicional, carga extra en DB  
**Workaround:** Ninguno — impacto bajo si hay categorías ya creadas  

---

### KI-013: `addToSavingGoal` puede exceder `target_amount`
**Módulo:** Finanzas — Metas de ahorro  
**Archivo:** `src/lib/actions/savings.ts:52-71`  
**Síntoma:** `current_amount` puede ser mayor que `target_amount` sin error  
**Causa:** Sin validación de límite superior  
**Impacto:** Dato inconsistente en DB (UI lo compensa con `Math.min(100, pct)`)  
**Workaround:** El UI muestra máximo 100% pero el dato en DB es incorrecto  

---

### KI-014: N+1 queries en conteo de votos de la encuesta
**Módulo:** Gamificación — Prize Poll  
**Archivo:** `src/lib/actions/gamification.ts:558-570`  
**Síntoma:** Una query COUNT por cada opción de la encuesta  
**Causa:** `Promise.all` de queries individuales en lugar de GROUP BY  
**Impacto:** Performance — cuadratico en número de opciones (máx 4, impacto bajo)  
**Workaround:** No necesario por ahora (máx 4 opciones)  

---

### KI-015: Stores Zustand definidos pero no utilizados
**Módulo:** Estado cliente  
**Archivos:** `src/stores/auth.store.ts`, `src/stores/house.store.ts`  
**Síntoma:** Los stores existen pero ningún componente los conecta ni consume  
**Causa:** Arquitectura migró a server components, los stores quedaron huérfanos  
**Impacto:** Deuda técnica — confusión para nuevos devs sobre el estado de la app  
**Workaround:** Ignorar los stores — no se usan  

---

### KI-016: `coerciones as unknown as` ocultan errores de tipo en joins de Supabase
**Módulo:** Múltiples  
**Archivos:** `src/app/(app)/page.tsx:27`, `ranking/page.tsx:26`, `home.ts:186`, `gamification.ts:258`  
**Síntoma:** El tipado de joins de Supabase no coincide con el tipo retornado  
**Causa:** La SDK de Supabase sin generación automática de tipos retorna tipos genéricos  
**Impacto:** Errores en runtime no detectables en compilación  
**Fix sugerido:** Generar tipos automáticos con `supabase gen types typescript`  

---

## BAJO

### KI-017: `execCommand("copy")` deprecado como fallback de clipboard
**Módulo:** Invitaciones  
**Archivo:** `src/app/(app)/_components/InviteModal.tsx:55-58`  
**Síntoma:** Fallback de copia usa API deprecada  
**Causa:** Código defensivo para browsers sin `navigator.clipboard`  
**Impacto:** Puede fallar silenciosamente en browsers modernos que eliminaron `execCommand`  

---

### KI-018: Side effect (setState) durante render en InviteModal
**Módulo:** Invitaciones  
**Archivo:** `src/app/(app)/_components/InviteModal.tsx:36-39`  
**Síntoma:** `setInvitedEmails` se llama en el render body  
**Causa:** Patrón de "derived state from props" incorrecto  
**Impacto:** Posible loop de renders en React strict mode  

---

### KI-019: Invitaciones email sin fecha de expiración
**Módulo:** Invitaciones — DB  
**Archivo:** `supabase/migrations/001_initial.sql:28-35`  
**Síntoma:** Una invitación creada hace 1 año sigue válida  
**Causa:** Tabla `invitations` sin columna `expires_at`  
**Impacto:** Seguridad menor — invitaciones perpetuas  

---

### KI-020: `avatar_url` en DB sin UI de gestión
**Módulo:** Perfil  
**Archivo:** `supabase/migrations/001_initial.sql:6`  
**Síntoma:** La columna existe en DB pero no hay upload ni display de avatar  
**Causa:** Feature pendiente de implementar  
**Impacto:** Dato no utilizable  

---

## Bugs activos en la rama main (git status al 2026-05-20)

Los siguientes archivos tienen cambios sin commitear que pueden incluir fixes o features en progreso:

- `src/app/(app)/_components/InviteModal.tsx`
- `src/app/(app)/finance/_components/AddRecordSheet.tsx`
- `src/app/(app)/finance/categories/_components/CategoriesList.tsx`
- `src/app/(app)/finance/contributions/_components/ContributionsList.tsx`
- `src/app/(app)/finance/savings/_components/SavingsList.tsx`
- `src/app/(app)/ranking/_components/RankingContent.tsx`
- `src/app/(app)/ranking/page.tsx`
- `src/lib/actions/gamification.ts`
- `src/types/index.ts`
- `supabase/migrations/008_prize_poll.sql` (nueva, sin commitear)

**No modificar estos archivos sin revisar los cambios actuales primero.**
