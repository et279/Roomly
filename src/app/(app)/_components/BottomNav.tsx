"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, ShoppingCart, User } from "lucide-react";

const links = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/tasks", icon: ListTodo, label: "Tareas" },
  { href: "/shopping", icon: ShoppingCart, label: "Compras" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
