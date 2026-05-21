-- Idempotent seed: role → permission mappings
-- Run after roles.sql and permissions.sql

-- Owner: all permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Owner'
on conflict do nothing;

-- Admin: all except manage_roles
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Admin' and p.key != 'manage_roles'
on conflict do nothing;

-- Adult: create_task, edit_task, view_finances, create_shopping, edit_shopping, view_ranking
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Adult'
  and p.key in ('create_task', 'edit_task', 'view_finances', 'create_shopping', 'edit_shopping', 'view_ranking')
on conflict do nothing;

-- Member: full household member access (preserves existing app behavior)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Member'
  and p.key in (
    'create_task', 'edit_task', 'delete_task',
    'view_finances', 'edit_finances',
    'create_shopping', 'edit_shopping',
    'view_ranking', 'manage_invites'
  )
on conflict do nothing;

-- Guest: view_ranking only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Guest' and p.key = 'view_ranking'
on conflict do nothing;
