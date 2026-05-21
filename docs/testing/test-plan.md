# Test Plan — Roomly
> Creado: 2026-05-20 | Cobertura actual: 0% (sin tests)

---

## Estado actual

No existe ningún archivo de tests en el proyecto. No hay configuración de Jest, Vitest ni Playwright. El `package.json` no incluye scripts de testing.

**Riesgo:** Cualquier refactor o nueva feature puede romper funcionalidades existentes sin detección automática.

---

## Estrategia de testing recomendada

### Prioridades de implementación

1. **Tests de integración de Server Actions** (mayor ROI, menor setup)
2. **Tests de reglas de negocio en funciones puras**
3. **Tests E2E para flujos críticos** (auth, invitación, pagos)
4. **Tests de RLS en Supabase** (usando supabase test helpers)

### Herramientas recomendadas

| Tipo | Herramienta | Justificación |
|------|-------------|---------------|
| Unit / Integration | Vitest | Nativo ESM, más rápido que Jest con Next.js |
| E2E | Playwright | Soporte mobile viewport, screenshots |
| DB testing | `supabase test db` | Valida RLS policies con test fixtures |
| Mocking Supabase | `@supabase/supabase-js` mock | Para unit tests sin DB real |

---

## Casos de test por módulo

---

### Módulo: Autenticación

#### Tests unitarios — funciones puras

| ID | Descripción | Función | Prioridad |
|----|-------------|---------|-----------|
| AUTH-U01 | Email inválido rechazado en signIn | `signIn` schema | ALTO |
| AUTH-U02 | Password < 6 chars rechazado | `signIn` / `signUp` schema | ALTO |
| AUTH-U03 | Nombre < 2 chars rechazado en signUp | `signUpSchema` | MEDIO |
| AUTH-U04 | Passwords no coinciden en reset | `resetPassword` / `changePassword` | ALTO |

#### Tests de integración

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| AUTH-I01 | Sign up crea perfil en `profiles` vía trigger | CRÍTICO |
| AUTH-I02 | Sign in exitoso redirige a `/` | ALTO |
| AUTH-I03 | Sign in fallido retorna error, no redirige | ALTO |
| AUTH-I04 | Token de invite en cookie se procesa en sign up | ALTO |
| AUTH-I05 | Forgot password envía email (mock de Supabase) | MEDIO |
| AUTH-I06 | Reset password desde link expirado retorna error | ALTO |

---

### Módulo: Hogares e Invitaciones

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| HOME-I01 | `createHome` crea hogar y membership del creador | CRÍTICO |
| HOME-I02 | `createHome` redirige si usuario ya tiene hogar | ALTO |
| HOME-I03 | `createInviteLink` genera token único con expiración de 7 días | ALTO |
| HOME-I04 | Visitar `/join/[token]` válido con usuario logueado une al hogar | CRÍTICO |
| HOME-I05 | Visitar `/join/[token]` expirado retorna error | ALTO |
| HOME-I06 | Visitar `/join/[token]` sin login redirige a register con cookie | ALTO |
| HOME-I07 | `removeMember` solo funciona para el admin del hogar | CRÍTICO |
| HOME-I08 | Admin no puede eliminarse a sí mismo | ALTO |
| HOME-I09 | Usuario con hogar previo sigue en hogar original al visitar invite link | ALTO |

---

### Módulo: Tareas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| TASK-U01 | `nextDueDate` daily suma 1 día | ALTO |
| TASK-U02 | `nextDueDate` weekly suma 7 días | ALTO |
| TASK-U03 | `nextDueDate` biweekly suma 14 días | ALTO |
| TASK-U04 | `nextDueDate` monthly suma 1 mes | ALTO |
| TASK-U05 | `nextDueDate` desde null usa fecha actual | MEDIO |
| TASK-I01 | `createTask` inserta tarea con campos correctos | ALTO |
| TASK-I02 | `createTask` requiere título no vacío | ALTO |
| TASK-I03 | `toggleTask(id, true)` registra `completed_by` y `completed_at` | CRÍTICO |
| TASK-I04 | `toggleTask(id, false)` limpia `completed_by` y `completed_at` | ALTO |
| TASK-I05 | `toggleTask` en tarea recurrente crea nueva tarea | CRÍTICO |
| TASK-I06 | `toggleTask` en tarea recurrente otorga puntos de gamificación | ALTO |
| TASK-I07 | `deleteTask` elimina tarea correctamente | MEDIO |
| TASK-I08 | Cambiar asignado trackea `original_assigned_to` | MEDIO |

---

### Módulo: Compras

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| SHOP-I01 | `createShoppingItem` inserta con campos correctos | ALTO |
| SHOP-I02 | `toggleShoppingItem(id, true)` registra `completed_by` | ALTO |
| SHOP-I03 | `toggleShoppingItem` otorga puntos de gamificación | ALTO |
| SHOP-I04 | `deleteShoppingItem` elimina ítem | MEDIO |

---

### Módulo: Finanzas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FIN-U01 | `resolveStatus` con paidAmount >= amount retorna 'paid' | CRÍTICO |
| FIN-U02 | `resolveStatus` con paidAmount > 0 < amount retorna 'partial' | CRÍTICO |
| FIN-U03 | `resolveStatus` vencida sin pago retorna 'overdue' | CRÍTICO |
| FIN-U04 | `resolveStatus` pendiente sin vencer retorna 'pending' | CRÍTICO |
| FIN-I01 | `createFinancialRecord` inserta registro con tipo válido | ALTO |
| FIN-I02 | `createFinancialRecord` rechaza monto <= 0 | ALTO |
| FIN-I03 | `createContribution` inserta cuota con estado calculado | ALTO |
| FIN-I04 | `updateContributionPayment` a 100% cambia status a 'paid' | CRÍTICO |
| FIN-I05 | `updateContributionPayment` a 100% otorga puntos de finanzas | ALTO |
| FIN-I06 | `addToSavingGoal` suma monto al current_amount | ALTO |
| FIN-I07 | `seedDefaultCategories` no duplica categorías | ALTO |

---

### Módulo: Gamificación

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| GAM-U01 | `getPeriodDates` monthly retorna 1ro y último del mes | ALTO |
| GAM-U02 | `getPeriodDates` biweekly día 1-15 retorna 1-15 | ALTO |
| GAM-U03 | `getPeriodDates` biweekly día 16+ retorna 16-fin | ALTO |
| GAM-I01 | `awardTaskPoints` crea período activo si no existe | CRÍTICO |
| GAM-I02 | `awardTaskPoints` +15 pts si completada antes del vencimiento | CRÍTICO |
| GAM-I03 | `awardTaskPoints` +10 pts si completada después del vencimiento | ALTO |
| GAM-I04 | `checkAndAwardAchievements` desbloquea 'first_task' al completar la 1ra | CRÍTICO |
| GAM-I05 | `checkAndAwardAchievements` no duplica logros ya obtenidos | CRÍTICO |
| GAM-I06 | `closePeriod` asigna final_rank por total_points descendente | CRÍTICO |
| GAM-I07 | `closePeriod` cambia status a 'closed' | CRÍTICO |
| GAM-I08 | `votePollOption` no permite votar si el usuario no es del hogar | ALTO |
| GAM-I09 | `savePollOptions` elimina votos anteriores al editar opciones | ALTO |

---

### Seguridad y RLS

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| SEC-R01 | Usuario sin hogar no puede leer tareas de otro hogar (anon key) | CRÍTICO |
| SEC-R02 | Usuario en Hogar A no puede insertar en Hogar B usando anon key | CRÍTICO |
| SEC-R03 | Usuario no puede modificar registros financieros de otros | ALTO |
| SEC-R04 | Invite link expirado no une al hogar | CRÍTICO |
| SEC-R05 | Layout `/app` redirige a login si no hay sesión | CRÍTICO |
| SEC-R06 | Layout `/app` redirige a create-home si no tiene hogar | CRÍTICO |

---

## Configuración sugerida (Vitest + Next.js)

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
```

---

## Cobertura objetivo

| Módulo | Objetivo cobertura |
|--------|-------------------|
| Funciones puras (utils, helpers) | 90% |
| Server Actions (integración) | 70% |
| Flujos críticos E2E | Top 5 flujos |
| RLS policies | 100% de tablas con datos sensibles |

---

## Flujos E2E prioritarios (Playwright)

1. **Registro completo**: sign up → create home → invite member → member acepta
2. **Ciclo de tarea**: crear tarea → asignar → completar → verificar puntos
3. **Flujo financiero**: registrar gasto → ver en dashboard → verificar métricas
4. **Gamificación**: completar logro → ver en achievements → verificar puntos en ranking
5. **Invite por link**: crear link → abrir en incognito → register → verificar membership
