-- Idempotent seed: permission keys
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
