import type { AppContext } from "@/lib/context/context.types";
import { Permission } from "./permissions";

// ── Role checks ───────────────────────────────────────────────────────────────

export function isOwner(ctx: AppContext): boolean {
  return ctx.membership.role?.name === "Owner";
}

export function isAdmin(ctx: AppContext): boolean {
  return ["Owner", "Admin"].includes(ctx.membership.role?.name ?? "");
}

// ── Permission checks ─────────────────────────────────────────────────────────

export function hasPermission(ctx: AppContext, permission: string): boolean {
  return ctx.permissions.includes(permission);
}

export function hasAnyPermission(ctx: AppContext, perms: string[]): boolean {
  return perms.some((p) => ctx.permissions.includes(p));
}

export function hasAllPermissions(ctx: AppContext, perms: string[]): boolean {
  return perms.every((p) => ctx.permissions.includes(p));
}

// ── Domain check functions ────────────────────────────────────────────────────

export function canManageHome(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.MANAGE_HOME);
}

export function canManageMembers(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.MANAGE_MEMBERS);
}

export function canManageRoles(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.MANAGE_ROLES);
}

export function canManageInvites(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.MANAGE_INVITES);
}

export function canManageGamification(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.MANAGE_GAMIFICATION);
}

export function canEditFinance(ctx: AppContext): boolean {
  return hasPermission(ctx, Permission.EDIT_FINANCES);
}
