"use client";

import Link from "next/link";
import type { TaskWithAssignee } from "@/types";

type Props = {
  userName: string;
  homeName: string;
  pendingTasks: TaskWithAssignee[];
};

export default function DashboardContent({
  userName,
  homeName,
  pendingTasks,
}: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Hola, {userName} 👋</h1>
          <p className="text-muted-foreground text-sm">{homeName}</p>
        </header>

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
              {pendingTasks.length === 5 && (
                <li>
                  <Link
                    href="/tasks"
                    className="block text-center text-sm text-muted-foreground hover:text-foreground py-2"
                  >
                    Ver más →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
