"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, Trash2, PiggyBank } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createSavingGoal, deleteSavingGoal, addToSavingGoal } from "@/lib/actions/savings";
import { formatMoney } from "@/utils/format";
import type { SavingGoal } from "@/types";
import FinanceNav from "../../_components/FinanceNav";

type Props = {
  goals: SavingGoal[];
  currentUserId: string;
};

export default function SavingsList({ goals }: Props) {
  const [openNew, setOpenNew] = useState(false);
  const [addingTo, setAddingTo] = useState<SavingGoal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localGoals, setLocalGoals] = useState(goals);
  const formRef = useRef<HTMLFormElement>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  function handleDelete(id: string) {
    setLocalGoals((prev) => prev.filter((g) => g.id !== id));
    startTransition(() => deleteSavingGoal(id));
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSavingGoal(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpenNew(false);
      }
    });
  }

  function handleAddAmount(formData: FormData) {
    if (!addingTo) return;
    const amountRaw = formData.get("amount") as string;
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) return;

    setLocalGoals((prev) =>
      prev.map((g) =>
        g.id === addingTo.id
          ? { ...g, current_amount: Number(g.current_amount) + amount }
          : g,
      ),
    );
    startTransition(() => addToSavingGoal(addingTo.id, amount));
    addFormRef.current?.reset();
    setAddingTo(null);
  }

  const active = localGoals.filter(
    (g) => Number(g.current_amount) < Number(g.target_amount),
  );
  const completed = localGoals.filter(
    (g) => Number(g.current_amount) >= Number(g.target_amount),
  );

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
            <h1 className="text-[2rem] font-bold tracking-tight leading-tight">Ahorros</h1>
          </div>
          <motion.button
            onClick={() => setOpenNew(true)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3.5 py-2 text-xs font-semibold"
          >
            <Plus size={14} strokeWidth={2.5} />
            Nueva meta
          </motion.button>
        </motion.header>

        <FinanceNav />

        {/* Metas activas */}
        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
              <PiggyBank size={15} className="text-muted-foreground" />
              Metas activas
            </h2>
            <ul className="space-y-3">
              {active.map((g) => {
                const pct = Math.min(
                  100,
                  Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100),
                );
                return (
                  <motion.li
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border bg-card px-4 py-4 card-shadow space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{g.name}</p>
                        {g.deadline && (
                          <p className="text-xs text-muted-foreground">Meta: {g.deadline}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <motion.button
                          onClick={() => setAddingTo(g)}
                          whileTap={{ scale: 0.82 }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                          title="Agregar monto"
                        >
                          <Plus size={14} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(g.id)}
                          whileTap={{ scale: 0.82 }}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">${formatMoney(Number(g.current_amount))}</span>
                        <span className="text-muted-foreground">
                          de ${formatMoney(Number(g.target_amount))}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-foreground"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right">
                        {pct}% · Faltan ${formatMoney(Number(g.target_amount) - Number(g.current_amount))}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Metas completadas */}
        {completed.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-[15px] tracking-tight text-muted-foreground">
              Completadas 🎉
            </h2>
            <ul className="space-y-2">
              {completed.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ${formatMoney(Number(g.target_amount))} logrado
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(g.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {localGoals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center space-y-2 card-shadow"
          >
            <p className="text-2xl">🐷</p>
            <p className="text-sm font-semibold">Sin metas de ahorro</p>
            <p className="text-xs text-muted-foreground">
              Creá metas compartidas: vacaciones, fondo de emergencia…
            </p>
          </motion.div>
        )}
      </div>

      {/* Sheet nueva meta */}
      <AnimatePresence>
        {openNew && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpenNew(false)}
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
                style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base">Nueva meta de ahorro</h2>
                  <button onClick={() => setOpenNew(false)} className="p-1.5 rounded-lg text-muted-foreground">
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
                      placeholder="Ej: Vacaciones"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Monto objetivo</label>
                    <input
                      name="target_amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fecha límite (opcional)</label>
                    <input
                      name="deadline"
                      type="date"
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {isPending ? "Guardando…" : "Crear meta"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sheet agregar monto */}
      <AnimatePresence>
        {addingTo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setAddingTo(null)}
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
                style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base">
                    Agregar a &ldquo;{addingTo.name}&rdquo;
                  </h2>
                  <button onClick={() => setAddingTo(null)} className="p-1.5 rounded-lg text-muted-foreground">
                    <X size={18} />
                  </button>
                </div>
                <form ref={addFormRef} action={handleAddAmount} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Monto a agregar</label>
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
                  <motion.button
                    type="submit"
                    disabled={isPending}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {isPending ? "Guardando…" : "Agregar"}
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
