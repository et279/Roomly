"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [state, action, isPending] = useActionState(resetPassword, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background text-2xl font-bold mx-auto">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
          <p className="text-muted-foreground text-sm">
            Elegí una contraseña nueva para tu cuenta
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 card-shadow space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Nueva contraseña
              </Label>
              <Input
                id="password"
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
                htmlFor="confirm"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Confirmar contraseña
              </Label>
              <Input
                id="confirm"
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

            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
