"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/finance", label: "Resumen" },
  { href: "/finance/records", label: "Movimientos" },
  { href: "/finance/contributions", label: "Aportes" },
  { href: "/finance/savings", label: "Ahorros" },
  { href: "/finance/categories", label: "Categorías" },
];

type Props = {
  active?: string;
};

export default function FinanceNav({ active }: Props) {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <nav className="flex gap-1 min-w-max">
        {tabs.map(({ href, label }) => {
          const isActive = active
            ? href === "/finance"
              ? active === "dashboard"
              : pathname === href
            : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
