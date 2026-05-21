"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Settings,
  Star,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  ShoppingCart,
  ListTodo,
  Wallet,
  Clock,
  Award,
  X,
  Check,
} from "lucide-react";
import { configureGamification, savePrizes, closePeriod, savePollOptions, votePollOption } from "@/lib/actions/gamification";
import type {
  GamificationSettings,
  RankingPeriod,
  RankingPrize,
  PeriodType,
} from "@/types";

type ScoreRow = {
  user_id: string;
  tasks_points: number;
  shopping_points: number;
  finance_points: number;
  achievement_points: number;
  total_points: number;
  profiles: { name: string } | null;
};

type PastScoreRow = {
  user_id: string;
  total_points: number;
  final_rank: number | null;
  profiles: { name: string } | null;
};

type Props = {
  settings: GamificationSettings | null;
  activePeriod: Pick<RankingPeriod, "id" | "period_type" | "start_date" | "end_date" | "status"> | null;
  pastPeriods: Pick<RankingPeriod, "id" | "period_type" | "start_date" | "end_date" | "status">[];
  scores: ScoreRow[] | null;
  prizes: Pick<RankingPrize, "rank" | "prize_description">[] | null;
  pastScores: Record<string, unknown[]>;
  isAdmin: boolean;
  currentUserId: string;
  homeId: string;
  members: { user_id: string; name: string }[];
  currentUserName: string;
  pollOptions: { id: string; option_text: string; vote_count: number }[];
  myVote: string | null;
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function daysLeft(end: string) {
  const diff = Math.ceil(
    (new Date(end + "T23:59:59").getTime() - Date.now()) / 86400000,
  );
  return Math.max(0, diff);
}

const rankEmoji = ["🥇", "🥈", "🥉"];

export default function RankingContent({
  settings,
  activePeriod,
  pastPeriods,
  scores,
  prizes,
  pastScores,
  isAdmin,
  currentUserId,
  homeId,
  members,
  pollOptions,
  myVote,
}: Props) {
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [, startTransition] = useTransition();

  const enabled = settings?.enabled ?? false;
  const sortedScores = [...(scores ?? [])].sort((a, b) => b.total_points - a.total_points);

  // Merge members with no score yet (show as 0 pts)
  const allRows: ScoreRow[] = members.map((m) => {
    const s = sortedScores.find((r) => r.user_id === m.user_id);
    return s ?? {
      user_id: m.user_id,
      tasks_points: 0,
      shopping_points: 0,
      finance_points: 0,
      achievement_points: 0,
      total_points: 0,
      profiles: { name: m.name },
    };
  }).sort((a, b) => b.total_points - a.total_points);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-32 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} strokeWidth={2} />
            </Link>
            <h1 className="text-[1.6rem] font-bold tracking-tight">Ranking</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/achievements"
              className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <Award size={13} />
              Logros
            </Link>
            {isAdmin && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowConfig(true)}
                className="rounded-xl border bg-card p-2 hover:bg-muted/40 transition-colors"
                aria-label="Configurar ranking"
              >
                <Settings size={16} className="text-muted-foreground" />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Not enabled */}
        {!enabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-8 text-center space-y-4 card-shadow"
          >
            <p className="text-4xl">🏆</p>
            <div className="space-y-1.5">
              <p className="font-semibold">Ranking no activado</p>
              <p className="text-sm text-muted-foreground leading-snug">
                {isAdmin
                  ? "Activá el ranking para empezar a competir y configurar premios."
                  : "El admin del hogar aún no activó el ranking."}
              </p>
            </div>
            {isAdmin && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowConfig(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold"
              >
                <Settings size={14} />
                Configurar ranking
              </motion.button>
            )}
            <div className="pt-2 border-t space-y-2 text-left">
              <p className="text-xs font-semibold text-muted-foreground">Cómo se ganan puntos:</p>
              <PointsLegend />
            </div>
          </motion.div>
        )}

        {/* Active period */}
        {enabled && activePeriod && (
          <>
            {/* Period badge */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 card-shadow"
            >
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">
                  Período {activePeriod.period_type === "monthly" ? "mensual" : "quincenal"}
                </p>
                <p className="text-sm font-semibold">
                  {formatDate(activePeriod.start_date)} – {formatDate(activePeriod.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={12} />
                <span className="font-semibold text-foreground">{daysLeft(activePeriod.end_date)}</span>
                días
              </div>
            </motion.div>

            {/* Ranking table */}
            <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-2">
              <h2 className="font-semibold text-[15px] tracking-tight flex items-center gap-1.5">
                <Trophy size={15} className="text-muted-foreground" />
                Tabla de posiciones
              </h2>

              {allRows.length === 0 ? (
                <div className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground card-shadow">
                  Aún no hay puntajes este período.
                </div>
              ) : (
                <ul className="space-y-2">
                  {allRows.map((row, i) => {
                    const prize = prizes?.find((p) => p.rank === i + 1);
                    const isMe = row.user_id === currentUserId;
                    return (
                      <motion.li
                        key={row.user_id}
                        variants={fadeUp}
                        className={`rounded-2xl border px-4 py-3.5 card-shadow transition-colors ${
                          isMe ? "bg-foreground text-background border-foreground" : "bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base w-6 text-center shrink-0">
                            {i < 3 ? rankEmoji[i] : (
                              <span className={`text-xs font-bold ${isMe ? "text-background/60" : "text-muted-foreground"}`}>
                                {i + 1}
                              </span>
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {row.profiles?.name ?? "Miembro"}
                              {isMe && (
                                <span className={`ml-1.5 text-[10px] font-medium ${isMe ? "text-background/60" : "text-muted-foreground"}`}>
                                  · vos
                                </span>
                              )}
                            </p>
                            {prize && (
                              <p className={`text-[10px] mt-0.5 ${isMe ? "text-background/70" : "text-muted-foreground"}`}>
                                🎁 {prize.prize_description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold leading-none">
                              {row.total_points}
                              <span className={`text-[10px] font-medium ml-0.5 ${isMe ? "text-background/60" : "text-muted-foreground"}`}>pts</span>
                            </p>
                            <BreakdownRow row={row} isMe={isMe} />
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </motion.section>

            {/* Prize poll */}
            {pollOptions.length > 0 ? (
              <PrizePollCard
                pollOptions={pollOptions}
                myVote={myVote}
                isAdmin={isAdmin}
                onEdit={() => setShowPoll(true)}
              />
            ) : isAdmin ? (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPoll(true)}
                className="w-full rounded-2xl border border-dashed px-4 py-3 text-xs font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                🎁 Crear encuesta de premio para el 1er puesto
              </motion.button>
            ) : null}

            {/* Points legend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border bg-card px-4 py-4 space-y-3 card-shadow"
            >
              <p className="text-xs font-semibold text-muted-foreground">Cómo ganar puntos</p>
              <PointsLegend />
            </motion.div>

            {/* Admin: close period */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CloseButton periodId={activePeriod.id} onClose={() => startTransition(() => {})} />
              </motion.div>
            )}
          </>
        )}

        {/* Enabled but no period yet */}
        {enabled && !activePeriod && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border bg-card p-6 text-center space-y-2 card-shadow"
          >
            <p className="text-2xl">⏳</p>
            <p className="text-sm font-semibold">Período se creará automáticamente</p>
            <p className="text-xs text-muted-foreground">
              El primer período se genera en cuanto alguien gana sus primeros puntos.
            </p>
          </motion.div>
        )}

        {/* History */}
        {pastPeriods.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Historial
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.ul
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {pastPeriods.map((p) => {
                    const ps = (pastScores[p.id] ?? []) as PastScoreRow[];
                    return (
                      <li key={p.id} className="rounded-2xl border bg-card px-4 py-3 card-shadow">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          {formatDate(p.start_date)} – {formatDate(p.end_date)}
                        </p>
                        {ps.slice(0, 3).map((s, i) => (
                          <div key={s.user_id} className="flex items-center gap-2 py-0.5">
                            <span className="text-sm">{rankEmoji[i] ?? (i + 1)}</span>
                            <span className="flex-1 text-sm">
                              {(s.profiles as { name: string } | null)?.name ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {s.total_points} pts
                            </span>
                          </div>
                        ))}
                      </li>
                    );
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </div>

      {/* Config modal */}
      <AnimatePresence>
        {showConfig && (
          <ConfigModal
            settings={settings}
            prizes={prizes}
            hasPeriod={!!activePeriod}
            onClose={() => setShowConfig(false)}
          />
        )}
      </AnimatePresence>

      {/* Poll modal */}
      <AnimatePresence>
        {showPoll && (
          <PollModal
            currentOptions={pollOptions}
            onClose={() => setShowPoll(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function BreakdownRow({ row, isMe }: { row: ScoreRow; isMe: boolean }) {
  const parts = [
    { icon: ListTodo, val: row.tasks_points, label: "t" },
    { icon: ShoppingCart, val: row.shopping_points, label: "s" },
    { icon: Wallet, val: row.finance_points, label: "f" },
    { icon: Star, val: row.achievement_points, label: "l" },
  ].filter((p) => p.val > 0);

  if (!parts.length) return null;

  return (
    <div className="flex items-center justify-end gap-1.5 mt-0.5">
      {parts.map(({ icon: Icon, val, label }) => (
        <span
          key={label}
          className={`flex items-center gap-0.5 text-[9px] ${isMe ? "text-background/50" : "text-muted-foreground"}`}
        >
          <Icon size={8} />
          {val}
        </span>
      ))}
    </div>
  );
}

function PointsLegend() {
  const items = [
    { icon: ListTodo, label: "Completar tarea", pts: "+10 pts (+5 antes del vencimiento)" },
    { icon: ShoppingCart, label: "Item de compras listo", pts: "+3 pts" },
    { icon: Wallet, label: "Cuota pagada", pts: "+25 pts" },
    { icon: Zap, label: "Logro desbloqueado", pts: "bonus" },
  ];
  return (
    <ul className="space-y-1.5">
      {items.map(({ icon: Icon, label, pts }) => (
        <li key={label} className="flex items-center gap-2 text-xs">
          <Icon size={12} className="text-muted-foreground shrink-0" />
          <span className="flex-1 text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{pts}</span>
        </li>
      ))}
    </ul>
  );
}

function CloseButton({ periodId, onClose }: { periodId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      await closePeriod(periodId);
      onClose();
    });
  }

  return (
    <button
      onClick={handleClose}
      disabled={pending}
      className="w-full rounded-2xl border border-dashed px-4 py-3 text-xs font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {pending ? "Cerrando período..." : "Cerrar período y asignar ganadores"}
    </button>
  );
}

function PrizePollCard({
  pollOptions,
  myVote,
  isAdmin,
  onEdit,
}: {
  pollOptions: { id: string; option_text: string; vote_count: number }[];
  myVote: string | null;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const [optimisticVote, setOptimisticVote] = useState(myVote);
  const [, startTransition] = useTransition();

  const totalVotes = pollOptions.reduce((s, o) => s + o.vote_count, 0);

  const adjustedOptions = pollOptions.map((opt) => ({
    ...opt,
    vote_count:
      opt.vote_count +
      (optimisticVote === opt.id && myVote !== opt.id ? 1 : 0) -
      (myVote === opt.id && optimisticVote !== opt.id ? 1 : 0),
  }));

  const adjustedTotal = adjustedOptions.reduce((s, o) => s + o.vote_count, 0);
  const maxVotes = Math.max(...adjustedOptions.map((o) => o.vote_count), 0);

  function handleVote(optionId: string) {
    if (optimisticVote === optionId) return;
    setOptimisticVote(optionId);
    startTransition(async () => {
      await votePollOption(optionId);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-2xl border bg-card px-4 py-4 space-y-3 card-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            🎁 Premio para el 🥇
          </p>
          <p className="text-[11px] text-muted-foreground">
            Votá tu opción · la ganadora se entrega al cerrar el ranking ·{" "}
            <span className="font-semibold text-foreground">{adjustedTotal}</span>{" "}
            {adjustedTotal === 1 ? "voto" : "votos"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-0.5"
          >
            Editar
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {adjustedOptions.map((opt) => {
          const isLeading = opt.vote_count === maxVotes && opt.vote_count > 0;
          const isMyVote = optimisticVote === opt.id;
          const pct =
            adjustedTotal > 0
              ? Math.round((opt.vote_count / adjustedTotal) * 100)
              : 0;

          return (
            <li key={opt.id}>
              <button
                onClick={() => handleVote(opt.id)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all relative overflow-hidden ${
                  isMyVote
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card hover:bg-muted/40"
                }`}
              >
                {adjustedTotal > 0 && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${
                      isMyVote ? "bg-background/10" : "bg-foreground/6"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="font-medium leading-snug">{opt.option_text}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLeading && <span className="text-xs">👑</span>}
                    {adjustedTotal > 0 && (
                      <span
                        className={`text-xs font-bold ${
                          isMyVote ? "text-background/70" : "text-muted-foreground"
                        }`}
                      >
                        {pct}%
                      </span>
                    )}
                    {isMyVote && (
                      <Check size={12} className="text-background/80" />
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function PollModal({
  currentOptions,
  onClose,
}: {
  currentOptions: { id: string; option_text: string; vote_count: number }[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await savePollOptions(null, fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4"
      style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="w-full max-w-md rounded-3xl border bg-card p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="font-bold text-base">Encuesta de premio 🎁</h2>
            <p className="text-xs text-muted-foreground leading-snug">
              Los miembros votan y la opción más votada se entrega al 1er puesto al cerrar el ranking
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-5 text-center font-bold shrink-0">
                {i}
              </span>
              <input
                name={`option_${i}`}
                defaultValue={currentOptions[i - 1]?.option_text ?? ""}
                placeholder={
                  i === 1
                    ? "Ej: Elige la cena del viernes"
                    : i === 2
                    ? "Ej: Día libre de tareas"
                    : `Opción ${i}${i > 2 ? " (opcional)" : ""}`
                }
                required={i <= 2}
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          ))}

          {currentOptions.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              ⚠️ Al guardar, los votos anteriores se reinician.
            </p>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {pending ? "Guardando..." : <><Check size={14} /> Guardar encuesta</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ConfigModal({
  settings,
  prizes,
  hasPeriod,
  onClose,
}: {
  settings: GamificationSettings | null;
  prizes: Pick<RankingPrize, "rank" | "prize_description">[] | null;
  hasPeriod: boolean;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [periodType, setPeriodType] = useState<PeriodType>(settings?.period_type ?? "monthly");
  const [pending, startTransition] = useTransition();
  const [prizesPending, setPrizesPending] = useTransition();

  function getPrize(rank: number) {
    return prizes?.find((p) => p.rank === rank)?.prize_description ?? "";
  }

  function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("enabled", String(enabled));
    fd.set("period_type", periodType);
    startTransition(async () => {
      await configureGamification(null, fd);
      onClose();
    });
  }

  function handleSavePrizes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPrizesPending(async () => {
      await savePrizes(null, fd);
      onClose();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4"
      style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className="w-full max-w-md rounded-3xl border bg-card p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Configurar ranking</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Settings */}
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Activar ranking</p>
              <p className="text-xs text-muted-foreground">Los miembros acumulan puntos</p>
            </div>
            <motion.button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              whileTap={{ scale: 0.9 }}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-foreground" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: enabled ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute top-1 w-4 h-4 rounded-full ${enabled ? "bg-background" : "bg-muted-foreground"}`}
              />
            </motion.button>
          </div>

          {/* Period type */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Período de ranking</p>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "biweekly"] as PeriodType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPeriodType(t)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    periodType === t
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card hover:bg-muted/40"
                  }`}
                >
                  {t === "monthly" ? "📅 Mensual" : "🗓️ Quincenal"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {periodType === "monthly"
                ? "El ranking se resetea el 1° de cada mes."
                : "El ranking se resetea el 1 y el 16 de cada mes."}
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {pending ? "Guardando..." : <><Check size={14} /> Guardar configuración</>}
          </button>
        </form>

        {/* Prizes — only shown when there's an active period */}
        {hasPeriod && (
          <form onSubmit={handleSavePrizes} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Premios del período actual</p>
            {[1, 2, 3].map((rank) => (
              <div key={rank} className="flex items-center gap-2">
                <span className="text-base w-6">{rankEmoji[rank - 1]}</span>
                <input
                  name={`prize_${rank}`}
                  defaultValue={getPrize(rank)}
                  placeholder={
                    rank === 1
                      ? "Ej: Elige el menú del fin de semana"
                      : rank === 2
                      ? "Ej: Se salva de lavar los platos"
                      : "Ej: Elige la película del viernes"
                  }
                  className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={prizesPending}
              className="w-full rounded-xl border py-2 text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              {prizesPending ? "Guardando..." : "Guardar premios"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
