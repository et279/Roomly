"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(signUp, null);

  if (state?.emailConfirmation) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="text-5xl">📬</div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight">Revisá tu email</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Te enviamos un link de confirmación. Una vez que lo aceptes, podés
              iniciar sesión.
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full rounded-xl">
              Ir al login
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background text-2xl font-bold mx-auto">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Roomly</h1>
          <p className="text-muted-foreground text-sm">Creá tu cuenta</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border bg-card p-6 card-shadow space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Nombre
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Tu nombre"
                autoComplete="name"
                required
                className="rounded-xl"
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
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
              {isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-foreground font-semibold underline underline-offset-4"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
