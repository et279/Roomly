"use client";

import { useActionState } from "react";
import { createHome } from "@/lib/actions/home";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateHomePage() {
  const [state, action, isPending] = useActionState(createHome, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl">🏠</div>
          <h1 className="text-2xl font-bold">Creá tu hogar</h1>
          <p className="text-muted-foreground text-sm">
            Dale un nombre al espacio que compartís con tus compañeros
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del hogar</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Ej: Casa Palermo, Depto 3B..."
              required
            />
          </div>

          {state?.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando..." : "Crear hogar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
