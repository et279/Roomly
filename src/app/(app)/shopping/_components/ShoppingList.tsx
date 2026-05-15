"use client";

import {
  useOptimistic,
  useActionState,
  startTransition,
  useState,
} from "react";
import { Trash2, ShoppingCart, CheckCircle2, Circle, Plus } from "lucide-react";
import {
  createShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
} from "@/lib/actions/shopping";
import type { ShoppingItemWithAdder } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  items: ShoppingItemWithAdder[];
  currentUserId: string;
};

type Filter = "pending" | "all" | "done";

type OptimisticAction =
  | { type: "toggle"; id: string; done: boolean }
  | { type: "delete"; id: string };

const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
};

export default function ShoppingList({ items }: Props) {
  const [filter, setFilter] = useState<Filter>("pending");

  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state: ShoppingItemWithAdder[], action: OptimisticAction) => {
      if (action.type === "toggle") {
        return state.map((i) =>
          i.id === action.id ? { ...i, done: action.done } : i,
        );
      }
      return state.filter((i) => i.id !== action.id);
    },
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
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-5">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" as const }}
          className="space-y-0.5"
        >
          <h1 className="text-[2rem] font-bold tracking-tight leading-tight flex items-center gap-2.5">
            <ShoppingCart size={26} strokeWidth={1.75} />
            Compras
          </h1>
          <p className="text-muted-foreground text-sm">
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            {doneCount > 0 &&
              ` · ${doneCount} comprado${doneCount !== 1 ? "s" : ""}`}
          </p>
        </motion.header>

        {/* Add form */}
        <motion.form
          action={formAction}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05, ease: "easeOut" as const }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <input
              name="title"
              placeholder="Agregar producto..."
              className="flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 card-shadow"
              required
            />
            <input
              name="quantity"
              placeholder="Cant."
              className="w-16 rounded-xl border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 card-shadow text-center"
            />
            <motion.button
              type="submit"
              disabled={pending}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="flex items-center justify-center rounded-xl bg-foreground text-background w-11 h-11 shrink-0 disabled:opacity-50 card-shadow"
            >
              <Plus size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
          {formState?.error && (
            <p className="text-destructive text-xs">{formState.error}</p>
          )}
        </motion.form>

        {/* Filter tabs */}
        <div className="relative flex gap-1 rounded-2xl bg-muted p-1">
          {(["pending", "all", "done"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="relative flex-1 rounded-xl py-2 text-sm font-medium z-10"
            >
              {filter === f && (
                <motion.div
                  layoutId="shopping-filter-pill"
                  className="absolute inset-0 rounded-xl bg-card shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-150 ${
                  filter === f ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {f === "pending" ? "Pendiente" : f === "all" ? "Todo" : "Comprado"}
              </span>
            </button>
          ))}
        </div>

        {/* Items */}
        <div>
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="py-16 text-center space-y-2"
              >
                <p className="text-3xl">
                  {filter === "pending" ? "🎉" : filter === "done" ? "🛍️" : "🛒"}
                </p>
                <p className="text-sm font-semibold">
                  {filter === "pending"
                    ? "Lista vacía"
                    : filter === "done"
                      ? "Nada comprado aún"
                      : "Sin productos"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filter === "pending"
                    ? "Agregá productos a la lista"
                    : filter === "done"
                      ? "Marcá items como comprados"
                      : "La lista está vacía"}
                </p>
              </motion.div>
            )}

            {filtered.map((item) => (
              <motion.div
                key={item.id}
                variants={listItemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                layout="position"
                className="mb-2"
              >
                <div
                  className={`flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 card-shadow transition-opacity duration-300 ${
                    item.done ? "opacity-50" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <motion.button
                    onClick={() =>
                      startTransition(() => {
                        updateOptimistic({
                          type: "toggle",
                          id: item.id,
                          done: !item.done,
                        });
                        toggleShoppingItem(item.id, !item.done);
                      })
                    }
                    whileTap={{ scale: 0.78 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="shrink-0"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {item.done ? (
                        <motion.span
                          key="checked"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 550,
                            damping: 24,
                          }}
                        >
                          <CheckCircle2
                            size={20}
                            className="text-foreground"
                            strokeWidth={2}
                          />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="unchecked"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 550,
                            damping: 24,
                          }}
                        >
                          <Circle
                            size={20}
                            className="text-border"
                            strokeWidth={1.75}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug transition-all duration-200 ${
                        item.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.profiles && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {item.profiles.name}
                      </p>
                    )}
                  </div>

                  {item.quantity && (
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.quantity}
                    </span>
                  )}

                  {/* Delete */}
                  <motion.button
                    onClick={() =>
                      startTransition(() => {
                        updateOptimistic({ type: "delete", id: item.id });
                        deleteShoppingItem(item.id);
                      })
                    }
                    whileTap={{ scale: 0.82 }}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
