"use client";

import Link from "next/link";
import { ListTodo, ShoppingCart, Trophy, ChevronRight, ArrowRight } from "lucide-react";
import type { TaskWithAssignee, MemberStat } from "@/types";
import { motion } from "framer-motion";
import InviteModal from "./InviteModal";

type Props = {
  userName: string;
  homeName: string;
  pendingTasks: TaskWithAssignee[];
  tasksDoneCount: number;
  tasksPendingCount: number;
  shoppingPendingCount: number;
  memberStats: MemberStat[];
  isAdmin: boolean;
  currentUserId: string;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

export default function DashboardContent({
  userName,
  homeName,
  pendingTasks,
  tasksDoneCount,
  tasksPendingCount,
  shoppingPendingCount,
  memberStats,
  isAdmin,
  currentUserId,
}: Props) {
  const sortedMembers = [...memberStats].sort((a, b) => b.done - a.done);
  const firstName = userName.split(" ")[0];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-7">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" as const }}
          className="space-y-0.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              {homeName}
            </p>
            <InviteModal
              members={memberStats.map((m) => ({ user_id: m.user_id, name: m.name }))}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          </div>
          <h1 className="text-[2rem] font-bold tracking-tight leading-tight">
            Hola, {firstName} 👋
          </h1>
        </motion.header>

        {/* Stats */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-2.5"
        >
          <motion.div variants={fadeUp}>
            <StatCard
              icon={<ListTodo size={14} />}
              label="Pendientes"
              value={tasksPendingCount}
              href="/tasks"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard
              icon={<ListTodo size={14} />}
              label="Completadas"
              value={tasksDoneCount}
              href="/tasks"
              accent
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard
              icon={<ShoppingCart size={14} />}
              label="Por comprar"
              value={shoppingPendingCount}
              href="/shopping"
            />
          </motion.div>
        </motion.section>

        {/* Pending tasks */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16, ease: "easeOut" as const }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[15px] tracking-tight">
              Tareas pendientes
            </h2>
            <Link
              href="/tasks"
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todas <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <EmptyTasksCard />
          ) : (
            <motion.ul
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-1.5"
            >
              {pendingTasks.map((task) => (
                <motion.li
                  key={task.id}
                  variants={fadeUp}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <span className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.75px] border-border" />
                  <span className="flex-1 text-sm font-medium leading-snug">
                    {task.title}
                  </span>
                  {task.profiles && (
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {task.profiles.name}
                    </span>
                  )}
                </motion.li>
              ))}
              {tasksPendingCount > 5 && (
                <motion.li variants={fadeUp}>
                  <Link
                    href="/tasks"
                    className="flex items-center justify-center gap-1.5 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors card-shadow"
                  >
                    Ver {tasksPendingCount - 5} más{" "}
                    <ArrowRight size={13} strokeWidth={2} />
                  </Link>
                </motion.li>
              )}
            </motion.ul>
          )}
        </motion.section>

        {/* Leaderboard */}
        {sortedMembers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.26, ease: "easeOut" as const }}
            className="space-y-3"
          >
            <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
              <Trophy size={15} className="text-muted-foreground" />
              Actividad del hogar
            </h2>
            <ul className="space-y-1.5">
              {sortedMembers.map((m, i) => (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 card-shadow"
                >
                  <span className="text-sm w-5 text-center shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{m.done}</span>
                    <span>hechas</span>
                    {m.pending > 0 && (
                      <>
                        <span className="opacity-30">·</span>
                        <span>{m.pending} pend.</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
    >
      <Link
        href={href}
        className={`rounded-2xl border p-3.5 space-y-2.5 block card-shadow ${
          accent
            ? "bg-foreground text-background border-foreground"
            : "bg-card hover:bg-muted/40 transition-colors"
        }`}
      >
        <div className={accent ? "text-background/55" : "text-muted-foreground"}>
          {icon}
        </div>
        <p className="text-[1.6rem] font-bold leading-none tracking-tight">{value}</p>
        <p
          className={`text-[10px] font-medium leading-tight ${
            accent ? "text-background/65" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
      </Link>
    </motion.div>
  );
}

function EmptyTasksCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" as const }}
      className="rounded-2xl border bg-card p-8 text-center space-y-3 card-shadow"
    >
      <p className="text-3xl">🎉</p>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Todo al día</p>
        <p className="text-xs text-muted-foreground">No hay tareas pendientes</p>
      </div>
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Agregar tarea <ArrowRight size={12} />
      </Link>
    </motion.div>
  );
}
