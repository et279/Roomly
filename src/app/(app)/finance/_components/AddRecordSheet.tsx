"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createFinancialRecord } from "@/lib/actions/finance";
import type { ExpenseCategory, FinancialRecordType } from "@/types";

type Props = {
  categories: ExpenseCategory[];
  currentUserId: string;
};

const TYPES: { value: FinancialRecordType; label: string }[] = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto" },
  { value: "saving", label: "Ahorro" },
  { value: "transfer", label: "Transferencia" },
  { value: "adjustment", label: "Ajuste" },
];

export default function AddRecordSheet({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFinancialRecord(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3.5 py-2 text-xs font-semibold"
      >
        <Plus size={14} strokeWidth={2.5} />
        Nuevo
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
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
                  <h2 className="font-semibold text-base">Nuevo movimiento</h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form ref={formRef} action={handleSubmit} className="space-y-4">
                  {/* Tipo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                    <select
                      name="type"
                      required
                      defaultValue="expense"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    >
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Monto */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Monto</label>
                    <input
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>

                  {/* Categoría */}
                  {categories.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Categoría (opcional)
                      </label>
                      <select
                        name="category_id"
                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Descripción */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Descripción (opcional)
                    </label>
                    <input
                      name="description"
                      type="text"
                      placeholder="Ej: Supermercado"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                    <input
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 font-medium">{error}</p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50 transition-opacity"
                  >
                    {isPending ? "Guardando…" : "Guardar movimiento"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
