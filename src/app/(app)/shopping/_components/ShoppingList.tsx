"use client";

import { useOptimistic, useActionState, startTransition, useState } from "react";
import { Trash2, ShoppingCart, Check } from "lucide-react";
import {
  createShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
} from "@/lib/actions/shopping";
import type { ShoppingItemWithAdder } from "@/types";

type Props = {
  items: ShoppingItemWithAdder[];
  currentUserId: string;
};

type Filter = "pending" | "all" | "done";

export default function ShoppingList({ items, currentUserId }: Props) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (
      state,
      action:
        | { type: "toggle"; id: string; done: boolean }
        | { type: "delete"; id: string }
    ) => {
      if (action.type === "toggle")
        return state.map((i) =>
          i.id === action.id ? { ...i, done: action.done } : i
        );
      return state.filter((i) => i.id !== action.id);
    }
  );

  const [formState, formAction, pending] = useActionState(createShoppingItem, {
    error: null as string | null,
  });

  const filtered =
    filter === "pending"
      ? optimisticItems.filter((i) => !i.done)
      : filter === "done"
      ? optimisticItems.filter((i) => i.done)
      : optimisticItems;

  const pendingCount = optimisticItems.filter((i) => !i.done).length;
  const doneCount = optimisticItems.filter((i) => i.done).length;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart size={24} />
            Lista de compras
          </h1>
          <p className="text-muted-foreground text-sm">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            {doneCount > 0 && ` · ${doneCount} comprado${doneCount !== 1 ? "s" : ""}`}
          </p>
        </header>

        {/* Add form */}
        <form action={formAction} className="space-y-2">
          <div className="flex gap-2">
            <input
              name="title"
              placeholder="Agregar producto..."
              className="flex-1 rounded-xl border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
              required
            />
            <input
              name="quantity"
              placeholder="Cant."
              className="w-20 rounded-xl border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              +
            </button>
          </div>
          {formState?.error && (
            <p className="text-destructive text-xs">{formState.error}</p>
          )}
        </form>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(["pending", "all", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {f === "pending" ? "Pendiente" : f === "all" ? "Todo" : "Comprado"}
            </button>
          ))}
        </div>

        {/* Items list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {filter === "pending"
                ? "No hay productos pendientes 🎉"
                : filter === "done"
                ? "Nada comprado aún"
                : "La lista está vacía"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-opacity ${
                  item.done ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() =>
                    startTransition(() => {
                      updateOptimistic({ type: "toggle", id: item.id, done: !item.done });
                      toggleShoppingItem(item.id, !item.done);
                    })
                  }
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    item.done
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground"
                  }`}
                >
                  {item.done && <Check size={11} strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.title}
                  </span>
                  {item.profiles && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      · {item.profiles.name}
                    </span>
                  )}
                </div>

                {item.quantity && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.quantity}
                  </span>
                )}

                <button
                  onClick={() =>
                    startTransition(() => {
                      updateOptimistic({ type: "delete", id: item.id });
                      deleteShoppingItem(item.id);
                    })
                  }
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
