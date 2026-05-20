"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Lock } from "lucide-react";
import type { AchievementWithStatus, ActivityCounters, AchievementCategory } from "@/types";

type Props = {
  achievements: AchievementWithStatus[];
  counters: ActivityCounters;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
};

const categoryLabels: Record<AchievementCategory, string> = {
  tasks: "Tareas",
  shopping: "Compras",
  finance: "Finanzas",
  ranking: "Ranking",
  general: "General",
};

const categoryEmoji: Record<AchievementCategory, string> = {
  tasks: "✅",
  shopping: "🛒",
  finance: "💰",
  ranking: "🏆",
  general: "⭐",
};

function counterForCondition(condition: string, counters: ActivityCounters): number {
  switch (condition) {
    case "tasks_completed": return counters.tasks_completed;
    case "shopping_done": return counters.shopping_done;
    case "contributions_paid": return counters.contributions_paid;
    case "periods_won": return counters.periods_won;
    default: return 0;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AchievementsContent({ achievements, counters }: Props) {
  const earned = achievements.filter((a) => a.earned);
  const total = achievements.length;

  const grouped = achievements.reduce(
    (acc, a) => {
      const cat = a.category as AchievementCategory;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    },
    {} as Record<AchievementCategory, AchievementWithStatus[]>,
  );

  const categories = Object.keys(grouped) as AchievementCategory[];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-32 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-center gap-2.5"
        >
          <Link
            href="/ranking"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </Link>
          <h1 className="text-[1.6rem] font-bold tracking-tight">Logros</h1>
        </motion.div>

        {/* Progress summary */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border bg-card px-5 py-4 card-shadow space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[1.8rem] font-bold leading-none">
                {earned.length}
                <span className="text-base font-medium text-muted-foreground ml-1">
                  / {total}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">logros desbloqueados</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {earned.reduce((sum, a) => sum + a.points, 0)}
              </p>
              <p className="text-xs text-muted-foreground">puntos ganados</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(earned.length / total) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="h-full rounded-full bg-foreground"
            />
          </div>
        </motion.div>

        {/* My activity counters */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2"
        >
          {[
            { label: "Tareas", value: counters.tasks_completed },
            { label: "Compras", value: counters.shopping_done },
            { label: "Cuotas", value: counters.contributions_paid },
            { label: "Títulos", value: counters.periods_won },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border bg-card px-2 py-3 text-center card-shadow"
            >
              <p className="text-xl font-bold leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Achievements by category */}
        {categories.map((cat, catIdx) => (
          <motion.section
            key={cat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + catIdx * 0.06 }}
            className="space-y-2"
          >
            <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
              <span>{categoryEmoji[cat]}</span>
              {categoryLabels[cat]}
            </h2>

            <motion.ul
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {grouped[cat].map((a) => {
                const current = counterForCondition(a.condition_type, counters);
                const progress = Math.min(current / a.condition_value, 1);
                const isEarned = a.earned;

                return (
                  <motion.li
                    key={a.id}
                    variants={fadeUp}
                    className={`rounded-2xl border px-4 py-3.5 card-shadow transition-all ${
                      isEarned
                        ? "bg-card border-foreground/20"
                        : "bg-card opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`relative text-2xl leading-none select-none ${
                          isEarned ? "" : "grayscale"
                        }`}
                      >
                        {a.icon}
                        {!isEarned && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-muted rounded-full p-0.5">
                            <Lock size={8} className="text-muted-foreground" />
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">{a.name}</p>
                          <span
                            className={`text-[11px] font-bold shrink-0 ${
                              isEarned ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            +{a.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{a.description}</p>

                        {/* Progress bar (only for not earned) */}
                        {!isEarned && current > 0 && (
                          <div className="space-y-0.5 pt-1">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full bg-foreground/40"
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {current} / {a.condition_value}
                            </p>
                          </div>
                        )}

                        {/* Earned date */}
                        {isEarned && a.earned_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Obtenido el {formatDate(a.earned_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.section>
        ))}
      </div>
    </main>
  );
}
