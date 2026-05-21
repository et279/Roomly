-- ── FASE 3: Sistema de Roles y Permisos ──────────────────────────────────────

-- Roles table
create table if not exists public.roles (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  is_system   boolean     not null default true,
  created_at  timestamptz default now()
);

-- Permissions table
create table if not exists public.permissions (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null unique,
  description text,
  created_at  timestamptz default now()
);

-- Role-Permissions junction table
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Add role_id to home_members
alter table public.home_members
  add column if not exists role_id uuid references public.roles(id) on delete set null;

-- ── Seed: Roles ──────────────────────────────────────────────────────────────
insert into public.roles (name, description, is_system) values
  ('Owner',  'Dueño del hogar con control total',        true),
  ('Admin',  'Administrador con permisos amplios',       true),
  ('Adult',  'Adulto con acceso estándar al hogar',      true),
  ('Member', 'Miembro estándar del hogar',               true),
  ('Guest',  'Invitado con acceso solo lectura',         true)
on conflict (name) do nothing;

-- ── Seed: Permissions ────────────────────────────────────────────────────────
insert into public.permissions (key, description) values
  ('manage_home',         'Crear y editar configuración del hogar'),
  ('manage_members',      'Agregar y eliminar miembros'),
  ('manage_roles',        'Asignar roles a miembros'),
  ('manage_invites',      'Crear y gestionar invitaciones'),
  ('create_task',         'Crear nuevas tareas'),
  ('edit_task',           'Editar tareas existentes'),
  ('delete_task',         'Eliminar tareas'),
  ('view_finances',       'Ver registros financieros'),
  ('edit_finances',       'Crear y editar registros financieros'),
  ('manage_gamification', 'Configurar ranking y premios'),
  ('view_ranking',        'Ver el ranking del período'),
  ('create_shopping',     'Agregar ítems a la lista de compras'),
  ('edit_shopping',       'Editar y eliminar ítems de la lista')
on conflict (key) do nothing;

-- ── Seed: Role-Permissions ───────────────────────────────────────────────────

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

-- Member: full household member access (preserves current app behavior for existing members)
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

-- ── Backward compatibility: assign roles to existing home_members ─────────────

-- Home creators → Owner
update public.home_members hm
set role_id = (select id from public.roles where name = 'Owner')
from public.homes h
where h.id = hm.home_id
  and h.created_by = hm.user_id
  and hm.role_id is null;

-- Non-creator members → Member
update public.home_members hm
set role_id = (select id from public.roles where name = 'Member')
from public.homes h
where h.id = hm.home_id
  and h.created_by != hm.user_id
  and hm.role_id is null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.roles           enable row level security;
alter table public.permissions     enable row level security;
alter table public.role_permissions enable row level security;

-- Roles: readable by all authenticated users (needed to display role names in UI)
create policy "Authenticated users can read roles"
  on public.roles for select
  using (auth.role() = 'authenticated');

-- Permissions: readable by all authenticated users
create policy "Authenticated users can read permissions"
  on public.permissions for select
  using (auth.role() = 'authenticated');

-- Role-Permissions: readable by all authenticated users
create policy "Authenticated users can read role_permissions"
  on public.role_permissions for select
  using (auth.role() = 'authenticated');
