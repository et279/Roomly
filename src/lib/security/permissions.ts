export const Permission = {
  // Home management
  MANAGE_HOME:         "manage_home",
  MANAGE_MEMBERS:      "manage_members",
  MANAGE_ROLES:        "manage_roles",
  MANAGE_INVITES:      "manage_invites",
  // Tasks
  CREATE_TASK:         "create_task",
  EDIT_TASK:           "edit_task",
  DELETE_TASK:         "delete_task",
  // Finances
  VIEW_FINANCES:       "view_finances",
  EDIT_FINANCES:       "edit_finances",
  // Gamification
  MANAGE_GAMIFICATION: "manage_gamification",
  VIEW_RANKING:        "view_ranking",
  // Shopping
  CREATE_SHOPPING:     "create_shopping",
  EDIT_SHOPPING:       "edit_shopping",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

// Static reference map — source of truth is the DB (role_permissions table).
// Kept here for documentation and offline reference only.
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  Owner: Object.values(Permission) as PermissionKey[],
  Admin: (Object.values(Permission) as PermissionKey[]).filter(
    (p) => p !== Permission.MANAGE_ROLES,
  ),
  Adult: [
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.VIEW_FINANCES,
    Permission.CREATE_SHOPPING,
    Permission.EDIT_SHOPPING,
    Permission.VIEW_RANKING,
  ],
  Member: [
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.DELETE_TASK,
    Permission.VIEW_FINANCES,
    Permission.EDIT_FINANCES,
    Permission.CREATE_SHOPPING,
    Permission.EDIT_SHOPPING,
    Permission.VIEW_RANKING,
    Permission.MANAGE_INVITES,
  ],
  Guest: [Permission.VIEW_RANKING],
};
