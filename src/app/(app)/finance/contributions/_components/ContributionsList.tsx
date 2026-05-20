"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createContribution,
  deleteContribution,
  updateContributionPayment,
} from "@/lib/actions/contributions";
import { formatMoney } from "@/utils/format";
import type { HouseContributionWithProfile, ContributionStatus } from "@/types";
import FinanceNav from "../../_components/FinanceNav";

type Props = {
  contributions: HouseContributionWithProfile[];
  members: { user_id: string; name: string }[];
  currentUserId: string;
};

const STATUS_LABEL: Record<ContributionStatus, string> = {
  paid: "Pagado",
  partial: "Parcial",
  pending: "Pendiente",
  overdue: "Vencido",
};

const STATUS_COLOR: Record<ContributionStatus, string> = {
  paid: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  pending: "text-muted-foreground",
  overdue: "text-red-600 dark:text-red-400",
};

export default function ContributionsList({ contributions, members, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localContribs, setLocalContribs] = useState(contributions);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDelete(id: string) {
    setLocalContribs((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteContribution(id));
  }

  function handleMarkPaid(c: HouseContributionWithProfile) {
    setLocalContribs((prev) =>
      prev.map((item) =>
        item.id === c.id
          ? { ...item, paid_amount: item.amount, status: "paid" as ContributionStatus }
          : item,
      ),
    );
    startTransition(() => updateContributionPayment(c.id, Number(c.amount)));
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createContribution(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
      }
    });
  }

  const pending = localContribs.filter((c) => c.status !== "paid");
  const paid = localContribs.filter((c) => c.status === "paid");

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
            <h1 className="text-[2rem] font-bold tracking-tight leading-tight">Aportes</h1>
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

        {/* Resumen */}
        {localContribs.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border bg-card p-3.5 card-shadow space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pendientes</p>
              <p className="text-lg font-bold">{pending.length}</p>
            </div>
            <div className="rounded-2xl border bg-card p-3.5 card-shadow space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total pendiente</p>
              <p className="text-lg font-bold">
                ${formatMoney(
                  pending.reduce((s, c) => s + Number(c.amount) - Number(c.paid_amount), 0),
                )}
              </p>
            </div>
          </div>
        )}

        {/* Lista pendientes */}
        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-[15px] tracking-tight">Por pagar</h2>
            <AnimatePresence>
              <ul className="space-y-1.5">
                {pending.map((c) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.profiles?.name ?? "Usuario"}</p>
                      <p className={`text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                        {c.status === "partial" &&
                          ` · $${formatMoney(Number(c.paid_amount))} pagado`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Vence {c.due_date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold">
                        ${formatMoney(Number(c.amount))}
                      </span>
                      <motion.button
                        onClick={() => handleMarkPaid(c)}
                        whileTap={{ scale: 0.82 }}
                        disabled={isPending}
                        title="Marcar como pagado"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 transition-colors"
                      >
                        <Check size={14} />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDelete(c.id)}
                        whileTap={{ scale: 0.82 }}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>
          </section>
        )}

        {/* Lista pagados */}
        {paid.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-[15px] tracking-tight text-muted-foreground">
              Pagados
            </h2>
            <ul className="space-y-1.5">
              {paid.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.profiles?.name ?? "Usuario"}</p>
                    <p className={`text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-semibold">
                      ${formatMoney(Number(c.amount))}
                    </span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {localContribs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center space-y-2 card-shadow"
          >
            <p className="text-2xl">💸</p>
            <p className="text-sm font-semibold">Sin aportes registrados</p>
            <p className="text-xs text-muted-foreground">
              Registrá las cuotas mensuales de cada miembro
            </p>
          </motion.div>
        )}
      </div>

      {/* Sheet para nueva contribución */}
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
                style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base">Nueva cuota</h2>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground">
                    <X size={18} />
                  </button>
                </div>

                <form ref={formRef} action={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Miembro</label>
                    <select
                      name="user_id"
                      required
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    >
                      <option value="">Seleccioná un miembro</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

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

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Fecha de vencimiento</label>
                    <input
                      name="due_date"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
                    <input
                      name="description"
                      type="text"
                      placeholder="Ej: Alquiler mayo"
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
                    {isPending ? "Guardando…" : "Registrar cuota"}
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
