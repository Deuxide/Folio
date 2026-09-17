import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { startReminderWatcher, stopReminderWatcher } from "@/features/scheduler/reminderWatcher";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Question Sets", end: true },
  { to: "/schedule", label: "Schedule", end: false },
  { to: "/history", label: "History", end: false },
  { to: "/statistics", label: "Statistics", end: false },
];

export function AppShell() {
  useEffect(() => {
    startReminderWatcher();
    return () => stopReminderWatcher();
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink
            to="/"
            className="flex min-w-0 items-center gap-2.5 no-underline"
            aria-label="Folio home"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-serif text-sm font-semibold text-primary-foreground">
              F
            </span>
            <span className="font-serif text-lg tracking-tight">Folio</span>
          </NavLink>
          <nav
            className="hidden items-center gap-1 sm:flex"
            aria-label="Main"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
        <nav
          className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:hidden"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <Outlet />
      </main>
    </div>
  );
}
