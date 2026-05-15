"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / brand */}
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background text-2xl font-bold mx-auto">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Roomly</h1>
          <p className="text-muted-foreground text-sm">
            Iniciá sesión para continuar
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card p-6 card-shadow space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
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
              {isPending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link
            href="/register"
            className="text-foreground font-semibold underline underline-offset-4"
          >
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
