"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, ShoppingCart, User } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/tasks", icon: ListTodo, label: "Tareas" },
  { href: "/shopping", icon: ShoppingCart, label: "Compras" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <nav
        className="w-full max-w-md rounded-2xl border bg-card/90 backdrop-blur-xl px-2 py-2"
        style={{
          boxShadow:
            "0 8px 32px oklch(0 0 0 / 0.10), 0 2px 8px oklch(0 0 0 / 0.06), 0 0 0 1px oklch(0 0 0 / 0.04)",
        }}
      >
        <div className="flex">
          {links.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 rounded-xl"
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-muted"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}

                <motion.span
                  className="relative z-10"
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.25 : 1.75}
                    className={`transition-colors duration-150 ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                </motion.span>

                <span
                  className={`relative z-10 text-[10px] font-medium tracking-wide transition-colors duration-150 ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
