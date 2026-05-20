"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPassword, null);

  if (state?.success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="text-5xl">📬</div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Revisá tu email</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Si el email existe en nuestra base, te enviamos un link para
              restablecer tu contraseña.
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-xl">
              Volver al login
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background text-2xl font-bold mx-auto">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Olvidé mi contraseña</h1>
          <p className="text-muted-foreground text-sm">
            Te enviamos un link para restablecerla
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 card-shadow space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
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
              {isPending ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/login"
            className="text-foreground font-semibold underline underline-offset-4"
          >
            Volver al login
          </Link>
        </p>
      </div>
    </main>
  );
}
