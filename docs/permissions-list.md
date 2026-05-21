# Permissions Reference

All 13 permission keys defined in `src/lib/security/permissions.ts` and seeded into the `permissions` table.

## Permission Keys

| Key | Constant | Description |
|-----|----------|-------------|
| `manage_home` | `Permission.MANAGE_HOME` | Crear y editar configuración del hogar |
| `manage_members` | `Permission.MANAGE_MEMBERS` | Agregar y eliminar miembros |
| `manage_roles` | `Permission.MANAGE_ROLES` | Asignar roles a miembros |
| `manage_invites` | `Permission.MANAGE_INVITES` | Crear y gestionar invitaciones |
| `create_task` | `Permission.CREATE_TASK` | Crear nuevas tareas |
| `edit_task` | `Permission.EDIT_TASK` | Editar tareas existentes |
| `delete_task` | `Permission.DELETE_TASK` | Eliminar tareas |
| `view_finances` | `Permission.VIEW_FINANCES` | Ver registros financieros |
| `edit_finances` | `Permission.EDIT_FINANCES` | Crear y editar registros financieros |
| `manage_gamification` | `Permission.MANAGE_GAMIFICATION` | Configurar ranking y premios |
| `view_ranking` | `Permission.VIEW_RANKING` | Ver el ranking del período |
| `create_shopping` | `Permission.CREATE_SHOPPING` | Agregar ítems a la lista de compras |
| `edit_shopping` | `Permission.EDIT_SHOPPING` | Editar y eliminar ítems de la lista |

## Permission Matrix

| Permission | Owner | Admin | Adult | Member | Guest |
|------------|:-----:|:-----:|:-----:|:------:|:-----:|
| manage_home | ✓ | ✓ | — | — | — |
| manage_members | ✓ | ✓ | — | — | — |
| manage_roles | ✓ | — | — | — | — |
| manage_invites | ✓ | ✓ | — | ✓ | — |
| create_task | ✓ | ✓ | ✓ | ✓ | — |
| edit_task | ✓ | ✓ | ✓ | ✓ | — |
| delete_task | ✓ | ✓ | — | ✓ | — |
| view_finances | ✓ | ✓ | ✓ | ✓ | — |
| edit_finances | ✓ | ✓ | — | ✓ | — |
| manage_gamification | ✓ | ✓ | — | — | — |
| view_ranking | ✓ | ✓ | ✓ | ✓ | ✓ |
| create_shopping | ✓ | ✓ | ✓ | ✓ | — |
| edit_shopping | ✓ | ✓ | ✓ | ✓ | — |

## Where Permissions Are Checked

| Permission | Server Action | UI Guard |
|------------|--------------|----------|
| create_task | `createTask()` | — |
| edit_task | `toggleTask()`, `updateTask()` | — |
| delete_task | `deleteTask()` | — |
| edit_finances | `createFinancialRecord()`, `updateFinancialRecord()`, `deleteFinancialRecord()`, `createContribution()`, `updateContributionPayment()`, `deleteContribution()`, all saving goals | — |
| create_shopping | `createShoppingItem()` | — |
| edit_shopping | `toggleShoppingItem()`, `deleteShoppingItem()` | — |
| manage_invites | `inviteMember()`, `createInviteLink()` | Invite button in InviteModal |
| manage_members | `removeMember()` | Delete member button in InviteModal |
| manage_gamification | `configureGamification()`, `savePrizes()`, `closePeriod()`, `savePollOptions()` | Admin controls in RankingContent |
| manage_roles | `assignRole()` | `/settings/roles` page (redirect on deny) |
