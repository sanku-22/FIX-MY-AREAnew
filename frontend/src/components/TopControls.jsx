import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { setLanguage } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { LogIn, LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopControls() {
  const { t, i18n } = useTranslation();
  const { user, openLogin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const lang = i18n.language?.startsWith("hi") ? "hi" : "en";

  return (
    <div className="flex items-center gap-1.5">
      <button data-testid="theme-toggle" onClick={toggle} title="Toggle theme"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-brutal-border bg-brutal-surface text-brutal-soft transition-colors hover:text-brutal-text">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <Link data-testid="admin-portal-link" to="/admin-login" title="Admin dashboard"
        className="flex h-8 items-center gap-1.5 rounded-full border border-brutal-border bg-brutal-surface px-2.5 text-xs font-semibold text-brutal-soft transition-colors hover:text-brutal-text">
        <ShieldCheck className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span>
      </Link>

      <div data-testid="language-toggle" className="flex overflow-hidden rounded-full border border-brutal-border bg-brutal-surface">
        {["en", "hi"].map((l) => (
          <button key={l} data-testid={`lang-${l}`} onClick={() => setLanguage(l)}
            className={cn("px-2 py-1.5 text-xs font-semibold transition-colors", lang === l ? "bg-brutal-accent text-white" : "text-brutal-soft")}>
            {l === "en" ? "EN" : "हिं"}
          </button>
        ))}
      </div>

      {user ? (
        <div className="flex items-center gap-1.5">
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-brutal-border bg-brutal-surface pl-1 pr-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brutal-accent text-[11px] font-bold text-white">
              {(user.name || "U").charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[70px] truncate text-xs font-semibold text-brutal-text sm:inline">{user.name || t("auth.guest")}</span>
          </span>
          <button data-testid="sign-out-btn" onClick={logout} title={t("auth.signOut")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-brutal-border bg-brutal-surface text-brutal-soft transition-colors hover:text-brutal-text">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button data-testid="sign-in-btn" onClick={openLogin}
          className="flex h-8 items-center gap-1.5 rounded-full bg-brutal-accent px-3 text-xs font-semibold text-white transition-colors hover:opacity-90">
          <LogIn className="h-4 w-4" /> {t("auth.signIn")}
        </button>
      )}
    </div>
  );
}
