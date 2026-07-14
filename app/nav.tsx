"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import ZoomControl from "./zoom-control";
import SessionControl from "./session-control";

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3">
        <h1 className="text-sm sm:text-base font-bold tracking-tight shrink-0">CPNS</h1>
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <nav className="flex gap-1 sm:gap-2 min-w-0">
            <Link
              href="/"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded border text-xs sm:text-sm whitespace-nowrap ${
                pathname === "/"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted"
              }`}
            >
              Study
            </Link>
            <Link
              href="/progress"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded border text-xs sm:text-sm whitespace-nowrap ${
                pathname === "/progress"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted"
              }`}
            >
              Progress
            </Link>
            <Link
              href="/browse"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded border text-xs sm:text-sm whitespace-nowrap ${
                pathname === "/browse"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted"
              }`}
            >
              Browse
            </Link>
            <Link
              href="/edit"
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded border text-xs sm:text-sm whitespace-nowrap ${
                pathname === "/edit"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted"
              }`}
            >
              Edit
            </Link>
          </nav>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 sm:p-2 border border-border rounded text-muted hover:text-foreground hover:border-foreground"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 p-3 bg-surface border border-border rounded-lg shadow-lg flex flex-col gap-3 min-w-[200px] z-50">
                <div className="text-xs font-semibold uppercase text-muted mb-1">Session</div>
                <SessionControl />
                <div className="h-px bg-border my-1 w-full" />
                <div className="text-xs font-semibold uppercase text-muted mb-1">Appearance</div>
                <ZoomControl />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
