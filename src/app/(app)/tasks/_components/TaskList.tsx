"use client";

import { useActionState, useOptimistic, useTransition, useState } from "react";
import { createTask, toggleTask, deleteTask } from "@/lib/actions/tasks";
import type { TaskWithAssignee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

type Member = {
  user_id: string;
  profiles: { id: string; name: string } | null;
};

type Props = {
  tasks: TaskWithAssignee[];
  members: Member[];
  currentUserId: string;
};

type Filter = "all" | "pending" | "done";

export default function TaskList({ tasks, members, currentUserId }: Props) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, updateOptimistic] = useOptimistic(
    tasks,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((t) => (t.id === id ? { ...t, done } : t)),
  );

  const [formState, formAction, isCreating] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createTask(prev, formData);
      if (result?.success) setShowForm(false);
      return result;
    },
    null,
  );

  const filtered = optimisticTasks.filter((t) =>
    filter === "all" ? true : filter === "pending" ? !t.done : t.done,
  );

  const pendingCount = optimisticTasks.filter((t) => !t.done).length;

  function handleToggle(id: string, done: boolean) {
    startTransition(async () => {
      updateOptimistic({ id, done: !done });
      await toggleTask(id, !done);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTask(id);
    });
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tareas</h1>
              <p className="text-muted-foreground text-sm">
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancelar" : "+ Nueva"}
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {(["pending", "all", "done"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {f === "pending" ? "Pendientes" : f === "all" ? "Todas" : "Hechas"}
              </button>
            ))}
          </div>
        </div>

        {/* Formulario nueva tarea */}
        {showForm && (
          <form action={formAction} className="px-4 pb-4 space-y-3">
            <Input
              name="title"
              placeholder="¿Qué hay que hacer?"
              autoFocus
              required
            />
            <select
              name="assigned_to"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">Sin asignar</option>
              {members.map((m) =>
                m.profiles ? (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles.name}
                    {m.user_id === currentUserId ? " (vos)" : ""}
                  </option>
                ) : null,
              )}
            </select>
            {formState?.error && (
              <p className="text-destructive text-sm">{formState.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? "Agregando..." : "Agregar tarea"}
            </Button>
          </form>
        )}

        {/* Lista */}
        <ul className="px-4 space-y-2">
          {filtered.length === 0 && (
            <li className="py-12 text-center text-muted-foreground text-sm">
              {filter === "done"
                ? "Todavía no completaste ninguna tarea"
                : "No hay tareas pendientes 🎉"}
            </li>
          )}
          {filtered.map((task) => (
            <li
              key={task.id}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-opacity ${
                task.done ? "opacity-60" : ""
              }`}
            >
              <button
                onClick={() => handleToggle(task.id, task.done)}
                disabled={isPending}
                className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
                  task.done
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {task.title}
                </p>
                {task.profiles && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {task.profiles.name}
                    {task.assigned_to === currentUserId ? " (vos)" : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                disabled={isPending}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
