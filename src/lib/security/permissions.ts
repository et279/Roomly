export const Permission = {
  MANAGE_HOME: "manage_home",
  MANAGE_MEMBERS: "manage_members",
  MANAGE_GAMIFICATION: "manage_gamification",
  EDIT_FINANCE: "edit_finance",
  VIEW_MEMBERS: "view_members",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: [
    Permission.MANAGE_HOME,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_GAMIFICATION,
    Permission.EDIT_FINANCE,
    Permission.VIEW_MEMBERS,
  ],
  member: [
    Permission.EDIT_FINANCE,
    Permission.VIEW_MEMBERS,
  ],
};
