"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateName } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

export function ChangeNameForm({ currentName }: { currentName: string }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const [state, action, isPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await updateName(prev, formData);
      if (result?.success) {
        setEditing(false);
        router.refresh();
      }
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 group"
      >
        <p className="font-semibold text-lg leading-tight">{currentName}</p>
        <Pencil
          size={13}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-center gap-2 w-full max-w-[220px]">
      <div className="flex items-center gap-1.5 w-full">
        <Input
          name="name"
          defaultValue={currentName}
          autoFocus
          className="rounded-xl h-8 text-sm text-center"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="h-8 w-8 rounded-xl shrink-0"
          disabled={isPending}
        >
          <Check size={14} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl shrink-0"
          onClick={() => setEditing(false)}
          disabled={isPending}
        >
          <X size={14} />
        </Button>
      </div>
      {state?.error && (
        <p className="text-destructive text-xs">{state.error}</p>
      )}
    </form>
  );
}
