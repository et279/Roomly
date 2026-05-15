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
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-semibold">Revisá tu email</h2>
          <p className="text-muted-foreground text-sm">
            Te enviamos un link de confirmación. Una vez que lo aceptes, podés iniciar sesión.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Ir al login
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold">Roomly</h1>
          <p className="text-muted-foreground text-sm">Creá tu cuenta</p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Tu nombre"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          {state?.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-foreground font-medium underline underline-offset-4">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
