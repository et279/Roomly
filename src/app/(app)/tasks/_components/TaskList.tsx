"use client";

import {
  useActionState,
  useOptimistic,
  useTransition,
  useState,
  useRef,
} from "react";
import {
  createTask,
  toggleTask,
  deleteTask,
  updateTask,
} from "@/lib/actions/tasks";
import type { TaskWithAssignee, Recurrence } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
  Check,
  X,
  Calendar,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
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

type StatusFilter = "all" | "pending" | "done";
type SortMode = "recent" | "date";

type OptimisticAction =
  | { type: "toggle"; id: string; done: boolean }
  | { type: "delete"; id: string };

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(dateStr: string | null, done: boolean) {
  if (!dateStr || done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

type EditState = {
  assignedTo: string;
  dueDate: string;
  recurrence: Recurrence | "";
};

function TaskItem({
  task,
  members,
  currentUserId,
  onToggle,
  onDelete,
  isPending,
}: {
  task: TaskWithAssignee;
  members: Member[];
  currentUserId: string;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, startSave] = useTransition();
  const [editState, setEditState] = useState<EditState>({
    assignedTo: task.assigned_to ?? "",
    dueDate: task.due_date ?? "",
    recurrence: task.recurrence ?? "",
  });

  function openEdit() {
    setEditState({
      assignedTo: task.assigned_to ?? "",
      dueDate: task.due_date ?? "",
      recurrence: task.recurrence ?? "",
    });
    setEditing(true);
  }

  function handleSave() {
    startSave(async () => {
      await updateTask(task.id, {
        assigned_to: editState.assignedTo || null,
        due_date: editState.dueDate || null,
        recurrence: (editState.recurrence as Recurrence) || null,
      });
      setEditing(false);
    });
  }

  const assigneeName = task.profiles?.name ?? null;
  const completedByName = task.completed_by_profile?.name ?? null;
  const completedBySelf = task.completed_by === task.assigned_to;
  const overdue = isOverdue(task.due_date, task.done);
  const formattedDue = formatDate(task.due_date);

  return (
    <motion.div
      variants={listItemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      layout="position"
      className="mb-2"
    >
      <div
        className={`rounded-2xl border bg-card card-shadow transition-opacity duration-300 ${
          task.done ? "opacity-55" : ""
        }`}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Checkbox */}
          <motion.button
            onClick={() => onToggle(task.id, task.done)}
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
                  transition={{ type: "spring", stiffness: 550, damping: 24 }}
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
                  transition={{ type: "spring", stiffness: 550, damping: 24 }}
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
                task.done ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.title}
            </p>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              {assigneeName && (
                <p className="text-muted-foreground text-xs">
                  {assigneeName}
                  {task.assigned_to === currentUserId ? " · vos" : ""}
                </p>
              )}

              {formattedDue && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    overdue ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <Calendar size={10} strokeWidth={2} />
                  {formattedDue}
                </span>
              )}

              {task.recurrence && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <RefreshCw size={10} strokeWidth={2} />
                  {RECURRENCE_LABELS[task.recurrence]}
                </span>
              )}
            </div>

            {task.done && completedByName && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {completedBySelf
                  ? `Hecha por ${
                      completedByName === task.profiles?.name
                        ? task.completed_by === currentUserId
                          ? "vos"
                          : completedByName
                        : task.completed_by === currentUserId
                          ? "vos"
                          : completedByName
                    }`
                  : `Hecha por ${task.completed_by === currentUserId ? "vos" : completedByName}${assigneeName ? ` (era ${task.assigned_to === currentUserId ? "vos" : assigneeName})` : ""}`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!task.done && (
              <motion.button
                onClick={editing ? () => setEditing(false) : openEdit}
                whileTap={{ scale: 0.82 }}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil size={13} />
              </motion.button>
            )}
            <motion.button
              onClick={() => onDelete(task.id)}
              disabled={isPending}
              whileTap={{ scale: 0.82 }}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
            </motion.button>
          </div>
        </div>

        {/* Inline edit section */}
        <AnimatePresence initial={false}>
          {editing && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" as const }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3.5 pt-0 space-y-2 border-t border-border/50 mt-0">
                <div className="pt-3 space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Responsable
                    </label>
                    <select
                      value={editState.assignedTo}
                      onChange={(e) =>
                        setEditState((s) => ({
                          ...s,
                          assignedTo: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
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
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Fecha límite
                    </label>
                    <input
                      type="date"
                      value={editState.dueDate}
                      onChange={(e) =>
                        setEditState((s) => ({
                          ...s,
                          dueDate: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Recurrencia
                    </label>
                    <select
                      value={editState.recurrence}
                      onChange={(e) =>
                        setEditState((s) => ({
                          ...s,
                          recurrence: e.target.value as Recurrence | "",
                        }))
                      }
                      className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
                    >
                      <option value="">Sin repetición</option>
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl h-8 text-xs gap-1.5"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Check size={13} />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl h-8 px-3"
                      onClick={() => setEditing(false)}
                    >
                      <X size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const UNASSIGNED = "__unassigned__";

export default function TaskList({ tasks, members, currentUserId }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const chipsRef = useRef<HTMLDivElement>(null);

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

  function toggleMemberFilter(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function clearMemberFilter() {
    setSelectedMembers([]);
  }

  // Apply status filter
  let filtered = optimisticTasks.filter((t) =>
    statusFilter === "all"
      ? true
      : statusFilter === "pending"
        ? !t.done
        : t.done,
  );

  // Apply member multi-filter
  if (selectedMembers.length > 0) {
    filtered = filtered.filter((t) => {
      if (selectedMembers.includes(UNASSIGNED) && t.assigned_to === null)
        return true;
      if (t.assigned_to && selectedMembers.includes(t.assigned_to)) return true;
      return false;
    });
  }

  // Apply sort
  filtered = [...filtered].sort((a, b) => {
    if (sortMode === "date") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    // recent: by created_at desc
    return b.created_at.localeCompare(a.created_at);
  });

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

  const hasActiveFilter = selectedMembers.length > 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="px-4 pt-9 pb-4 space-y-4">
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

          {/* Status filter tabs */}
          <div className="relative flex gap-1 rounded-2xl bg-muted p-1">
            {(["pending", "all", "done"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className="relative flex-1 rounded-xl py-2 text-sm font-medium z-10"
              >
                {statusFilter === f && (
                  <motion.div
                    layoutId="task-filter-pill"
                    className="absolute inset-0 rounded-xl bg-card shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span
                  className={`relative z-10 transition-colors duration-150 ${
                    statusFilter === f
                      ? "text-foreground"
                      : "text-muted-foreground"
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

          {/* Member filter chips + sort */}
          <div className="space-y-2">
            <div
              ref={chipsRef}
              className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
            >
              {/* All chip */}
              <button
                onClick={clearMemberFilter}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  !hasActiveFilter
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border"
                }`}
              >
                Todos
              </button>

              {/* Member chips */}
              {members.map((m) =>
                m.profiles ? (
                  <button
                    key={m.user_id}
                    onClick={() => toggleMemberFilter(m.user_id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                      selectedMembers.includes(m.user_id)
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border"
                    }`}
                  >
                    {m.profiles.name}
                    {m.user_id === currentUserId ? " · vos" : ""}
                  </button>
                ) : null,
              )}

              {/* Unassigned chip */}
              <button
                onClick={() => toggleMemberFilter(UNASSIGNED)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  selectedMembers.includes(UNASSIGNED)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border"
                }`}
              >
                Sin asignar
              </button>
            </div>

            {/* Sort toggle */}
            <div className="flex justify-end">
              <button
                onClick={() =>
                  setSortMode((s) => (s === "recent" ? "date" : "recent"))
                }
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowUpDown size={11} strokeWidth={2} />
                {sortMode === "recent" ? "Recientes" : "Por fecha"}
              </button>
            </div>
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
                <div className="flex items-center gap-2">
                  <Calendar
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                  <input
                    type="date"
                    name="due_date"
                    className="flex-1 rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw
                    size={14}
                    className="text-muted-foreground shrink-0"
                  />
                  <select
                    name="recurrence"
                    className="flex-1 rounded-xl border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/15"
                    defaultValue=""
                  >
                    <option value="">Sin repetición</option>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
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
                  {statusFilter === "done" ? "📋" : hasActiveFilter ? "🔍" : "🎉"}
                </p>
                <p className="text-sm font-semibold">
                  {statusFilter === "done"
                    ? "Sin tareas hechas"
                    : hasActiveFilter
                      ? "Sin resultados"
                      : "Todo al día"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statusFilter === "done"
                    ? "Completá una tarea para verla acá"
                    : hasActiveFilter
                      ? "Probá seleccionando otros filtros"
                      : "No hay tareas pendientes"}
                </p>
              </motion.div>
            )}

            {filtered.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                members={members}
                currentUserId={currentUserId}
                onToggle={handleToggle}
                onDelete={handleDelete}
                isPending={isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
