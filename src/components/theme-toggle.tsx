"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        </div>
        <div className="h-7 w-12 rounded-full bg-muted" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ rotate: isDark ? 0 : 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-muted-foreground"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </motion.span>
        <div>
          <p className="text-xs text-muted-foreground">Apariencia</p>
          <p className="text-sm font-medium">{isDark ? "Oscuro" : "Claro"}</p>
        </div>
      </div>

      {/* iOS-style switch */}
      <motion.button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        whileTap={{ scale: 0.95 }}
        className={`relative flex h-7 w-12 items-center rounded-full px-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDark ? "bg-foreground" : "bg-muted"
        }`}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        <motion.div
          layout
          animate={{ x: isDark ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
          className={`h-6 w-6 rounded-full flex items-center justify-center shadow-sm ${
            isDark ? "bg-background" : "bg-card"
          }`}
          style={{
            boxShadow: "0 1px 4px oklch(0 0 0 / 0.18)",
          }}
        >
          {isDark ? (
            <Moon size={11} className="text-foreground" />
          ) : (
            <Sun size={11} className="text-muted-foreground" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}
