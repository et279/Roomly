"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ChevronRight } from "lucide-react";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);

  const [state, action, isPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await changePassword(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null,
  );

  return (
    <div className="rounded-2xl border bg-card card-shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-4 py-3.5 w-full text-left"
      >
        <KeyRound size={16} className="text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Contraseña</p>
          <p className="text-sm font-medium">••••••••</p>
        </div>
        <ChevronRight
          size={15}
          className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="h-px bg-border mx-4" />
          <form action={action} className="px-4 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="cp-password"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Nueva contraseña
              </Label>
              <Input
                id="cp-password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="cp-confirm"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Confirmar
              </Label>
              <Input
                id="cp-confirm"
                name="confirm"
                type="password"
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
                required
                className="rounded-xl"
              />
            </div>

            {state?.error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {state.error}
              </p>
            )}

            {state?.success && (
              <p className="rounded-xl bg-green-500/10 px-3 py-2 text-green-600 dark:text-green-400 text-sm">
                Contraseña actualizada
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1 rounded-xl"
                disabled={isPending}
              >
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
