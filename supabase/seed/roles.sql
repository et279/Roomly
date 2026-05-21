-- Idempotent seed: system roles
insert into public.roles (name, description, is_system) values
  ('Owner',  'Dueño del hogar con control total',   true),
  ('Admin',  'Administrador con permisos amplios',  true),
  ('Adult',  'Adulto con acceso estándar al hogar', true),
  ('Member', 'Miembro estándar del hogar',          true),
  ('Guest',  'Invitado con acceso solo lectura',    true)
on conflict (name) do nothing;
