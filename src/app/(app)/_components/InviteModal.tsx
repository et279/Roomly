"use client";

import { useActionState, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Copy, Check, MessageCircle, Link2, Trash2 } from "lucide-react";
import { createInviteLink, inviteMember, removeMember } from "@/lib/actions/home";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = { user_id: string; name: string };

type Props = {
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
};

export default function InviteModal({ members, isAdmin, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [linkState, linkAction, linkPending] = useActionState(
    createInviteLink,
    null,
  );
  const [emailState, emailAction, emailPending] = useActionState(
    inviteMember,
    null,
  );
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  if (
    emailState?.success &&
    emailState.email &&
    !invitedEmails.includes(emailState.email)
  ) {
    setInvitedEmails((prev) => [...prev, emailState.email as string]);
  }

  const inviteUrl = linkState?.token
    ? `${window.location.origin}/join/${linkState.token}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappUrl = inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `¡Te invito a gestionar el hogar juntos en Roomly! Abrí este enlace para unirte: ${inviteUrl}`,
      )}`
    : null;

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      const result = await removeMember(userId);
      if (result?.error) {
        setRemoveError(result.error);
      } else {
        setConfirmId(null);
        setRemoveError(null);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <UserPlus size={13} strokeWidth={2} />
        Invitar
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl p-6 space-y-6 max-w-md mx-auto shadow-2xl"
              style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex justify-center">
                <div className="w-9 h-1 rounded-full bg-muted" />
              </div>

              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-bold">Invitar al hogar</h2>
                  <p className="text-sm text-muted-foreground">
                    Ambos van a poder gestionar tareas, compras y estadísticas
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 hover:bg-muted transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Members section */}
              {members.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Miembros actuales
                  </p>
                  <ul className="space-y-1.5">
                    {members.map((m) => (
                      <li
                        key={m.user_id}
                        className="flex items-center gap-3 rounded-2xl border bg-card px-3.5 py-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="flex-1 text-sm font-medium truncate">
                          {m.name}
                        </span>
                        {m.user_id === currentUserId && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Tú
                          </span>
                        )}
                        {isAdmin && m.user_id !== currentUserId && (
                          <>
                            {confirmId === m.user_id ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setConfirmId(null);
                                    setRemoveError(null);
                                  }}
                                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                                  disabled={isPending}
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleRemove(m.user_id)}
                                  disabled={isPending}
                                  className="text-[11px] font-semibold text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
                                >
                                  {isPending ? "..." : "Eliminar"}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmId(m.user_id);
                                  setRemoveError(null);
                                }}
                                className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {removeError && (
                    <p className="text-destructive text-xs">{removeError}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Al eliminar a un miembro se conserva todo su historial de tareas y compras.
                  </p>
                </div>
              )}

              {/* Link section */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Enlace para compartir
                </p>

                {!inviteUrl ? (
                  <>
                    <form action={linkAction}>
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full gap-2"
                        disabled={linkPending}
                      >
                        <Link2 size={14} />
                        {linkPending ? "Generando..." : "Generar enlace"}
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground text-center">
                      Válido por 7 días · cualquier persona con el enlace puede unirse
                    </p>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-3.5 py-2.5">
                      <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
                        {inviteUrl}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
                      >
                        {copied ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={whatsappUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copied ? "¡Copiado!" : "Copiar"}
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Válido por 7 días
                    </p>
                  </div>
                )}

                {linkState?.error && (
                  <p className="text-destructive text-sm">{linkState.error}</p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  o invitá por email
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email section */}
              <div className="space-y-3">
                <form action={emailAction} className="flex gap-2">
                  <Input
                    name="email"
                    type="email"
                    placeholder="email@ejemplo.com"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={emailPending}
                    className="shrink-0"
                  >
                    {emailPending ? "..." : "Enviar"}
                  </Button>
                </form>

                {emailState?.error && (
                  <p className="text-destructive text-sm">{emailState.error}</p>
                )}

                {invitedEmails.length > 0 && (
                  <ul className="space-y-1.5">
                    {invitedEmails.map((email) => (
                      <li key={email} className="flex items-center gap-2">
                        <Check size={13} className="text-green-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {email}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
