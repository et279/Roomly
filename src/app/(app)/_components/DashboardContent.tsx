"use client";

import Link from "next/link";
import { ListTodo, ShoppingCart, Trophy } from "lucide-react";
import type { TaskWithAssignee, MemberStat } from "@/types";

type Props = {
  userName: string;
  homeName: string;
  pendingTasks: TaskWithAssignee[];
  tasksDoneCount: number;
  tasksPendingCount: number;
  shoppingPendingCount: number;
  memberStats: MemberStat[];
};

export default function DashboardContent({
  userName,
  homeName,
  pendingTasks,
  tasksDoneCount,
  tasksPendingCount,
  shoppingPendingCount,
  memberStats,
}: Props) {
  const sortedMembers = [...memberStats].sort((a, b) => b.done - a.done);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Hola, {userName} 👋</h1>
          <p className="text-muted-foreground text-sm">{homeName}</p>
        </header>

        {/* Stats row */}
        <section className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<ListTodo size={16} />}
            label="Pendientes"
            value={tasksPendingCount}
            href="/tasks"
          />
          <StatCard
            icon={<ListTodo size={16} />}
            label="Hechas"
            value={tasksDoneCount}
            href="/tasks"
            accent
          />
          <StatCard
            icon={<ShoppingCart size={16} />}
            label="Compras"
            value={shoppingPendingCount}
            href="/shopping"
          />
        </section>

        {/* Pending tasks preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Tareas pendientes</h2>
            <Link
              href="/tasks"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Ver todas
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No hay tareas pendientes 🎉
              </p>
              <Link
                href="/tasks"
                className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
              >
                Agregar una tarea
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground" />
                  <span className="flex-1 text-sm">{task.title}</span>
                  {task.profiles && (
                    <span className="text-muted-foreground text-xs">
                      {task.profiles.name}
                    </span>
                  )}
                </li>
              ))}
              {tasksPendingCount > 5 && (
                <li>
                  <Link
                    href="/tasks"
                    className="block text-center text-sm text-muted-foreground hover:text-foreground py-2"
                  >
                    Ver {tasksPendingCount - 5} más →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* Member leaderboard */}
        {sortedMembers.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Trophy size={18} />
              Actividad del hogar
            </h2>
            <ul className="space-y-2">
              {sortedMembers.map((m, i) => (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="text-foreground font-semibold">
                      {m.done} hechas
                    </span>
                    {m.pending > 0 && <span>{m.pending} pend.</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
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
    <Link
      href={href}
      className={`rounded-xl border p-3 space-y-1 block transition-colors hover:bg-muted/50 ${
        accent ? "bg-foreground text-background border-foreground" : "bg-card"
      }`}
    >
      <div className={accent ? "text-background/70" : "text-muted-foreground"}>
        {icon}
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className={`text-xs ${accent ? "text-background/80" : "text-muted-foreground"}`}>
        {label}
      </p>
    </Link>
  );
}
