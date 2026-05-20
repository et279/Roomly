"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronRight,
  ArrowRight,
  Plus,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import type {
  FinanceMetrics,
  FinancialRecordWithDetails,
  HouseContributionWithProfile,
  SavingGoal,
  ExpenseCategory,
} from "@/types";
import { formatMoney } from "@/utils/format";
import FinanceNav from "./FinanceNav";
import AddRecordSheet from "./AddRecordSheet";

type Props = {
  metrics: FinanceMetrics;
  recentRecords: FinancialRecordWithDetails[];
  contributions: HouseContributionWithProfile[];
  savingGoals: SavingGoal[];
  categories: ExpenseCategory[];
  currentUserId: string;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  saving: "Ahorro",
  transfer: "Transferencia",
  adjustment: "Ajuste",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Pagado",
  partial: "Parcial",
  pending: "Pendiente",
  overdue: "Vencido",
};

const STATUS_COLOR: Record<string, string> = {
  paid: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  pending: "text-muted-foreground",
  overdue: "text-red-600 dark:text-red-400",
};

export default function FinanceDashboard({
  metrics,
  recentRecords,
  contributions,
  savingGoals,
  categories,
  currentUserId,
}: Props) {
  const pendingContribs = contributions.filter(
    (c) => c.status !== "paid",
  );

  const activeGoals = savingGoals.filter(
    (g) => Number(g.current_amount) < Number(g.target_amount),
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-7">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" as const }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              Este mes
            </p>
            <h1 className="text-[2rem] font-bold tracking-tight leading-tight">
              Finanzas
            </h1>
          </div>
          <AddRecordSheet categories={categories} currentUserId={currentUserId} />
        </motion.header>

        {/* Sub-nav */}
        <FinanceNav active="dashboard" />

        {/* Balance principal */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" as const }}
          className="rounded-2xl border bg-foreground text-background p-5 card-shadow space-y-1"
        >
          <p className="text-xs font-medium opacity-60 tracking-wide">Balance del mes</p>
          <p
            className={`text-[2.4rem] font-bold tracking-tight leading-none ${
              metrics.monthlyBalance >= 0 ? "" : "text-red-300"
            }`}
          >
            ${formatMoney(Math.abs(metrics.monthlyBalance))}
            {metrics.monthlyBalance < 0 && (
              <span className="text-base ml-1 opacity-70">negativo</span>
            )}
          </p>
        </motion.section>

        {/* Stats grid */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-2.5"
        >
          <motion.div variants={fadeUp}>
            <MetricCard
              icon={<TrendingUp size={14} />}
              label="Ingresos"
              value={metrics.monthlyIncome}
              href="/finance/records"
              positive
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <MetricCard
              icon={<TrendingDown size={14} />}
              label="Gastos"
              value={metrics.monthlyExpenses}
              href="/finance/records"
              negative
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <MetricCard
              icon={<PiggyBank size={14} />}
              label="Ahorros"
              value={metrics.monthlySavings}
              href="/finance/savings"
            />
          </motion.div>
        </motion.section>

        {/* Mayor gasto por categoría */}
        {metrics.topCategory && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.14, ease: "easeOut" as const }}
            className="rounded-2xl border bg-card p-4 card-shadow space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground tracking-wide">
              Mayor categoría de gasto
            </p>
            <div className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ backgroundColor: metrics.topCategory.color + "22" }}
              >
                💸
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{metrics.topCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  ${formatMoney(metrics.topCategory.total)}
                </p>
              </div>
              <Link
                href="/finance/records"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                Ver <ChevronRight size={12} />
              </Link>
            </div>
          </motion.section>
        )}

        {/* Movimientos recientes */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18, ease: "easeOut" as const }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
              <Wallet size={15} className="text-muted-foreground" />
              Movimientos recientes
            </h2>
            <Link
              href="/finance/records"
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {recentRecords.length === 0 ? (
            <EmptyCard
              emoji="💰"
              title="Sin movimientos"
              description="Registrá tu primer ingreso o gasto"
              href="/finance/records"
              linkLabel="Agregar movimiento"
            />
          ) : (
            <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
              {recentRecords.map((r) => (
                <motion.li
                  key={r.id}
                  variants={fadeUp}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
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
                    <p className="text-sm font-medium leading-snug truncate">
                      {r.description ?? r.expense_categories?.name ?? TYPE_LABEL[r.type]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[r.type]}
                      {r.profiles ? ` · ${r.profiles.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ${
                      r.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : r.type === "saving"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {r.type === "income" ? "+" : "-"}${formatMoney(Number(r.amount))}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.section>

        {/* Estado de cuotas */}
        {contributions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.24, ease: "easeOut" as const }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[15px] tracking-tight">
                Cuotas del mes
              </h2>
              <Link
                href="/finance/contributions"
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todas <ChevronRight size={13} strokeWidth={2} />
              </Link>
            </div>
            <ul className="space-y-1.5">
              {contributions.slice(0, 4).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {c.profiles?.name ?? "Usuario"}
                    </p>
                    <p className={`text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                      {c.status === "partial" &&
                        ` · $${formatMoney(Number(c.paid_amount))} de $${formatMoney(Number(c.amount))}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">
                    ${formatMoney(Number(c.amount))}
                  </span>
                </li>
              ))}
              {pendingContribs.length > 0 && (
                <li className="text-xs text-center text-muted-foreground pt-1">
                  {pendingContribs.length} cuota{pendingContribs.length !== 1 ? "s" : ""} pendiente{pendingContribs.length !== 1 ? "s" : ""}
                </li>
              )}
            </ul>
          </motion.section>
        )}

        {/* Metas de ahorro */}
        {activeGoals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3, ease: "easeOut" as const }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
                <Target size={15} className="text-muted-foreground" />
                Metas activas
              </h2>
              <Link
                href="/finance/savings"
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver todas <ChevronRight size={13} strokeWidth={2} />
              </Link>
            </div>
            <ul className="space-y-1.5">
              {activeGoals.slice(0, 3).map((g) => {
                const pct = Math.min(
                  100,
                  Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100),
                );
                return (
                  <li
                    key={g.id}
                    className="rounded-2xl border bg-card px-4 py-3 card-shadow space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{g.name}</p>
                      <span className="text-xs text-muted-foreground">
                        ${formatMoney(Number(g.current_amount))} / ${formatMoney(Number(g.target_amount))}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{pct}% completado</p>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}

        {/* Empty state si no hay datos */}
        {recentRecords.length === 0 && contributions.length === 0 && activeGoals.length === 0 && (
          <EmptyCard
            emoji="🏦"
            title="Todo listo"
            description="Comenzá registrando ingresos, gastos o metas de ahorro"
            href="/finance/records"
            linkLabel="Primer movimiento"
          />
        )}
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  href,
  positive,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
    >
      <Link
        href={href}
        className="rounded-2xl border bg-card p-3.5 space-y-2.5 block card-shadow hover:bg-muted/40 transition-colors"
      >
        <div
          className={
            positive
              ? "text-emerald-600 dark:text-emerald-400"
              : negative
              ? "text-red-500 dark:text-red-400"
              : "text-muted-foreground"
          }
        >
          {icon}
        </div>
        <p className="text-[1.35rem] font-bold leading-none tracking-tight">
          ${formatMoney(value)}
        </p>
        <p className="text-[10px] font-medium leading-tight text-muted-foreground">
          {label}
        </p>
      </Link>
    </motion.div>
  );
}

function EmptyCard({
  emoji,
  title,
  description,
  href,
  linkLabel,
}: {
  emoji: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" as const }}
      className="rounded-2xl border bg-card p-8 text-center space-y-3 card-shadow"
    >
      <p className="text-3xl">{emoji}</p>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {linkLabel} <ArrowRight size={12} />
      </Link>
    </motion.div>
  );
}
