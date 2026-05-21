# Roles System

## Overview

Phase 3 introduces a DB-backed role system that replaces the hardcoded `home.created_by === user.id` check used throughout Phase 1 and 2.

## Tables

| Table | Purpose |
|-------|---------|
| `roles` | System roles: Owner, Admin, Adult, Member, Guest |
| `permissions` | Permission keys (13 total) |
| `role_permissions` | Junction table: role → many permissions |
| `home_members.role_id` | FK to `roles.id`, nullable |

## System Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| Owner | Home creator, full control | All 13 |
| Admin | Broad admin, no role management | 12 (all except manage_roles) |
| Adult | Standard adult household member | 6 |
| Member | Default for invited users | 9 (preserves existing app behavior) |
| Guest | Read-only access | 1 (view_ranking) |

## Role Assignment

- **createHome** → creator gets Owner role
- **inviteMember / join link** → new member gets Member role
- **Existing members** → migration assigns Owner to creators, Member to others
- **reassign** → Owner can change any member's role via `/settings/roles`

## Backward Compatibility

Member role includes all permissions that existing non-creator members had:
`create_task, edit_task, delete_task, view_finances, edit_finances, create_shopping, edit_shopping, view_ranking, manage_invites`

This ensures no existing user loses access when the migration runs.

## Phase 4 Readiness

- Roles are DB records → custom roles can be added without code changes
- `is_system = true` marks roles that shouldn't be deleted
- The permission keys are a stable API — new features add new keys without breaking existing checks
