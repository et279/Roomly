"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronDown } from "lucide-react";
import { assignRole } from "@/lib/actions/roles";

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
};

type Member = {
  id: string;
  user_id: string;
  name: string;
  currentRoleId: string | null;
  currentRoleName: string | null;
  isSelf: boolean;
};

type Props = {
  members: Member[];
  roles: Role[];
  migrationPending?: boolean;
};

const ROLE_BADGE: Record<string, string> = {
  Owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Adult: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Member: "bg-muted text-muted-foreground",
  Guest: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function RolesPanel({ members, roles, migrationPending }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAssign(memberUserId: string, roleId: string, memberName: string, roleName: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await assignRole(memberUserId, roleId);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(`Rol de ${memberName} actualizado a ${roleName}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  }

  return (
    <div className="space-y-8">
      {migrationPending && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
          La migración de base de datos aún no fue aplicada. Los miembros se muestran sin rol. Aplicá la migración <code className="font-mono text-xs">012_roles_permissions.sql</code> para habilitar la asignación de roles.
        </p>
      )}

      {/* Members section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Miembros
        </h2>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
            {success}
          </p>
        )}

        <ul className="space-y-2">
          {members.map((m) => (
            <motion.li
              key={m.user_id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  {m.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.name}
                  {m.isSelf && (
                    <span className="ml-1.5 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      Tú
                    </span>
                  )}
                </p>
                {m.currentRoleName && (
                  <span
                    className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      ROLE_BADGE[m.currentRoleName] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.currentRoleName}
                  </span>
                )}
              </div>

              {!m.isSelf && (
                <div className="relative shrink-0">
                  <select
                    defaultValue={m.currentRoleId ?? ""}
                    onChange={(e) => {
                      const role = roles.find((r) => r.id === e.target.value);
                      if (role) handleAssign(m.user_id, role.id, m.name, role.name);
                    }}
                    className="appearance-none bg-muted text-foreground text-xs font-medium rounded-xl pl-3 pr-7 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="" disabled>
                      Seleccionar
                    </option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
                  />
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Roles reference */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Permisos por rol
        </h2>
        <div className="space-y-2">
          {roles.map((role) => (
            <details
              key={role.id}
              className="group rounded-2xl border bg-card overflow-hidden"
            >
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                <Shield size={14} className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium">{role.name}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    ROLE_BADGE[role.name] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {role.permissions.length} permisos
                </span>
              </summary>
              <div className="px-4 pb-3 pt-1 border-t bg-muted/20">
                {role.description && (
                  <p className="text-xs text-muted-foreground pt-2 pb-1">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {role.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sin permisos</span>
                  ) : (
                    role.permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-lg"
                      >
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
