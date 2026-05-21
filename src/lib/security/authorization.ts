import type { AppContext } from "@/lib/context/context.types";

export function isOwner(ctx: AppContext): boolean {
  return ctx.membership.role === "admin";
}

export function hasPermission(ctx: AppContext, permission: string): boolean {
  return ctx.permissions.includes(permission);
}

export function canManageHome(ctx: AppContext): boolean {
  return isOwner(ctx);
}

export function canManageMembers(ctx: AppContext): boolean {
  return isOwner(ctx);
}

export function canManageGamification(ctx: AppContext): boolean {
  return isOwner(ctx);
}

export function canEditFinance(_ctx: AppContext): boolean {
  return true;
}
