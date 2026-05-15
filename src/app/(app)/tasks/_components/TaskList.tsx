"use client";

import { useActionState, useOptimistic, useTransition, useState } from "react";
import { createTask, toggleTask, deleteTask } from "@/lib/actions/tasks";
import type { TaskWithAssignee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

type OptimisticAction =
  | { type: "toggle"; id: string; done: boolean }
  | { type: "delete"; id: string };

const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.15, ease: "easeOut" as const },
  },
};

export default function TaskList({ tasks, members, currentUserId }: Props) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, updateOptimistic] = useOptimistic(
    tasks,
    (state: TaskWithAssignee[], action: OptimisticAction) => {
      if (action.type === "toggle") {
        return state.map((t) =>
          t.id === action.id ? { ...t, done: action.done } : t,
        );
      }
      return state.filter((t) => t.id !== action.id);
    },
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
      updateOptimistic({ type: "toggle", id, done: !done });
      await toggleTask(id, !done);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      updateOptimistic({ type: "delete", id });
      await deleteTask(id);
    });
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="px-4 pt-9 pb-5 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-[2rem] font-bold tracking-tight leading-tight">
                Tareas
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              onClick={() => setShowForm((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                showForm
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              <motion.span
                animate={{ rotate: showForm ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 28 }}
                className="flex"
              >
                <Plus size={15} strokeWidth={2.5} />
              </motion.span>
              {showForm ? "Cancelar" : "Nueva"}
            </motion.button>
          </motion.div>

          {/* Filter tabs */}
          <div className="relative flex gap-1 rounded-2xl bg-muted p-1">
            {(["pending", "all", "done"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative flex-1 rounded-xl py-2 text-sm font-medium z-10"
              >
                {filter === f && (
                  <motion.div
                    layoutId="task-filter-pill"
                    className="absolute inset-0 rounded-xl bg-card shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-150 ${
                    filter === f ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {f === "pending"
                    ? "Pendientes"
                    : f === "all"
                      ? "Todas"
                      : "Hechas"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* New task form */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" as const }}
              className="overflow-hidden"
            >
              <form action={formAction} className="px-4 pb-4 space-y-2.5">
                <Input
                  name="title"
                  placeholder="¿Qué hay que hacer?"
                  autoFocus
                  required
                  className="rounded-xl"
                />
                <select
                  name="assigned_to"
                  className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
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
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={isCreating}
                >
                  {isCreating ? "Agregando..." : "Agregar tarea"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task list */}
        <div className="px-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="py-16 text-center space-y-2"
              >
                <p className="text-3xl">
                  {filter === "done" ? "📋" : "🎉"}
                </p>
                <p className="text-sm font-semibold">
                  {filter === "done" ? "Sin tareas hechas" : "Todo al día"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filter === "done"
                    ? "Completá una tarea para verla acá"
                    : "No hay tareas pendientes"}
                </p>
              </motion.div>
            )}

            {filtered.map((task) => (
              <motion.div
                key={task.id}
                variants={listItemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                layout="position"
                className="mb-2"
              >
                <div
                  className={`flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 card-shadow transition-opacity duration-300 ${
                    task.done ? "opacity-50" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <motion.button
                    onClick={() => handleToggle(task.id, task.done)}
                    disabled={isPending}
                    whileTap={{ scale: 0.78 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="shrink-0"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {task.done ? (
                        <motion.span
                          key="checked"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 550,
                            damping: 24,
                          }}
                        >
                          <CheckCircle2
                            size={20}
                            className="text-foreground"
                            strokeWidth={2}
                          />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="unchecked"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 550,
                            damping: 24,
                          }}
                        >
                          <Circle
                            size={20}
                            className="text-border"
                            strokeWidth={1.75}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-snug transition-all duration-200 ${
                        task.done
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.profiles && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {task.profiles.name}
                        {task.assigned_to === currentUserId ? " · vos" : ""}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <motion.button
                    onClick={() => handleDelete(task.id)}
                    disabled={isPending}
                    whileTap={{ scale: 0.82 }}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
