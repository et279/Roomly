"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCategory, deleteCategory } from "@/lib/actions/categories";
import type { ExpenseCategory } from "@/types";
import FinanceNav from "../../_components/FinanceNav";

type Props = {
  categories: ExpenseCategory[];
};

const PRESET_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#10b981",
  "#14b8a6",
  "#94a3b8",
];

export default function CategoriesList({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDelete(id: string) {
    setLocalCategories((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteCategory(id));
  }

  function handleCreate(formData: FormData) {
    setError(null);
    formData.set("color", selectedColor);
    startTransition(async () => {
      const result = await createCategory(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setSelectedColor(PRESET_COLORS[0]);
        setOpen(false);
      }
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" as const }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground tracking-wide">Finanzas</p>
            <h1 className="text-[2rem] font-bold tracking-tight leading-tight">Categorías</h1>
          </div>
          <motion.button
            onClick={() => setOpen(true)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3.5 py-2 text-xs font-semibold"
          >
            <Plus size={14} strokeWidth={2.5} />
            Nueva
          </motion.button>
        </motion.header>

        <FinanceNav />

        {/* Lista */}
        {localCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center space-y-2 card-shadow"
          >
            <p className="text-2xl">🏷️</p>
            <p className="text-sm font-semibold">Sin categorías</p>
            <p className="text-xs text-muted-foreground">
              Creá categorías personalizadas para organizar tus gastos
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <ul className="space-y-1.5">
              {localCategories.map((c) => (
                <motion.li
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: c.color + "22" }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  </span>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <motion.button
                    onClick={() => handleDelete(c.id)}
                    whileTap={{ scale: 0.82 }}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        )}
      </div>

      {/* Sheet nueva categoría */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            >
              <div
                className="w-full max-w-md rounded-t-3xl border bg-card px-5 pt-5 pb-8 space-y-5"
                style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base">Nueva categoría</h2>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground">
                    <X size={18} />
                  </button>
                </div>

                <form ref={formRef} action={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="Ej: Ropa"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className="w-7 h-7 rounded-full transition-transform"
                          style={{
                            backgroundColor: color,
                            transform: selectedColor === color ? "scale(1.25)" : "scale(1)",
                            outline: selectedColor === color ? `2px solid ${color}` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {isPending ? "Guardando…" : "Crear categoría"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
