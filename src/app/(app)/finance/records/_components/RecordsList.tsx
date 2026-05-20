"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { deleteFinancialRecord } from "@/lib/actions/finance";
import { formatMoney } from "@/utils/format";
import type { ExpenseCategory, FinancialRecordWithDetails, FinancialRecordType } from "@/types";
import FinanceNav from "../../_components/FinanceNav";
import AddRecordSheet from "../../_components/AddRecordSheet";

type Props = {
  records: FinancialRecordWithDetails[];
  categories: ExpenseCategory[];
  currentUserId: string;
};

const TYPE_LABEL: Record<FinancialRecordType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  saving: "Ahorro",
  transfer: "Transferencia",
  adjustment: "Ajuste",
};

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
  { value: "saving", label: "Ahorros" },
];

export default function RecordsList({ records, categories, currentUserId }: Props) {
  const [filter, setFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [localRecords, setLocalRecords] = useState(records);

  function handleDelete(id: string) {
    setLocalRecords((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteFinancialRecord(id));
  }

  const filtered =
    filter === "all" ? localRecords : localRecords.filter((r) => r.type === filter);

  const totalIncome = localRecords
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = localRecords
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0);

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
            <h1 className="text-[2rem] font-bold tracking-tight leading-tight">Movimientos</h1>
          </div>
          <AddRecordSheet categories={categories} currentUserId={currentUserId} />
        </motion.header>

        <FinanceNav />

        {/* Resumen rápido */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border bg-card p-3.5 card-shadow space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Ingresos
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              +${formatMoney(totalIncome)}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-3.5 card-shadow space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Gastos
            </p>
            <p className="text-lg font-bold text-red-500 dark:text-red-400">
              -${formatMoney(totalExpense)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                filter === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground bg-muted/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center space-y-2 card-shadow"
          >
            <p className="text-2xl">💳</p>
            <p className="text-sm font-semibold">Sin movimientos</p>
            <p className="text-xs text-muted-foreground">
              {filter === "all"
                ? "Registrá tu primer movimiento"
                : `No hay ${TYPE_FILTER_OPTIONS.find((o) => o.value === filter)?.label.toLowerCase()}`}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <ul className="space-y-1.5">
              {filtered.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor:
                        r.expense_categories?.color
                          ? r.expense_categories.color + "22"
                          : r.type === "income"
                          ? "#10b98122"
                          : r.type === "saving"
                          ? "#6366f122"
                          : "#f43f5e22",
                    }}
                  >
                    {r.type === "income" ? "↑" : r.type === "saving" ? "🏦" : "↓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.description ?? r.expense_categories?.name ?? TYPE_LABEL[r.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[r.type]}
                      {r.expense_categories ? ` · ${r.expense_categories.name}` : ""}
                      {r.profiles ? ` · ${r.profiles.name}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-semibold ${
                        r.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : r.type === "saving"
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {r.type === "income" ? "+" : "-"}${formatMoney(Number(r.amount))}
                    </span>
                    {r.user_id === currentUserId && (
                      <motion.button
                        onClick={() => handleDelete(r.id)}
                        whileTap={{ scale: 0.82 }}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
