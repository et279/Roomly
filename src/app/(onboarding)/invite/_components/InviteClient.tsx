"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteMember } from "@/lib/actions/home";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InviteClient() {
  const [state, action, isPending] = useActionState(inviteMember, null);
  const [invited, setInvited] = useState<string[]>([]);
  const router = useRouter();

  if (state?.success && state.email && !invited.includes(state.email)) {
    setInvited((prev) => [...prev, state.email as string]);
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-2 text-center">
        <div className="text-4xl">👥</div>
        <h1 className="text-2xl font-bold">Invitá compañeros</h1>
        <p className="text-muted-foreground text-sm">
          Podés invitar a quienes compartís el hogar ahora o hacerlo después
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email del compañero</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="compañero@email.com"
            required
          />
        </div>

        {state?.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Invitando..." : "Enviar invitación"}
        </Button>
      </form>

      {invited.length > 0 && (
        <ul className="space-y-2">
          {invited.map((email) => (
            <li key={email} className="flex items-center gap-2 text-sm">
              <span className="text-green-500">✓</span>
              <span>{email}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => router.push("/")}
      >
        {invited.length > 0 ? "Listo, ir al inicio" : "Saltar por ahora"}
      </Button>
    </div>
  );
}
