"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AtlasMascot } from "@/components/atlas/AtlasMascot";

const AtlasAssistantPanel = dynamic(
  () =>
    import("@/components/atlas/AtlasAssistantPanel").then(
      (module) => module.AtlasAssistantPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed inset-x-3 bottom-3 z-[60] h-[min(46rem,calc(100dvh-env(safe-area-inset-top)))] animate-pulse rounded-t-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-lg)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-[24rem] sm:rounded-[2rem] sm:border-zinc-300/80 sm:bg-zinc-100"
        role="status"
        aria-label="Opening Atlas"
      />
    ),
  },
);

const LAUNCHER_ID = "atlas-assistant-launcher";
const PANEL_ID = "atlas-assistant-panel";

export function AtlasAssistantShell() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      setOpen(false);
      previousPathname.current = pathname;
    }
  }, [pathname]);

  function closeAndRestoreFocus() {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }

  return (
    <>
      <button
        ref={launcherRef}
        id={LAUNCHER_ID}
        type="button"
        aria-label="Open Atlas, your TrustVault guide"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        tabIndex={open ? -1 : 0}
        onClick={() => setOpen(true)}
        className={`atlas-launcher group fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-[60] flex h-[4.75rem] w-[4.75rem] items-end justify-center rounded-full bg-transparent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4 sm:bottom-4 sm:right-4 sm:h-[5.25rem] sm:w-[5.25rem] ${
          open
            ? "pointer-events-none scale-95 opacity-0"
            : "opacity-100 hover:-translate-y-1"
        }`}
      >
        <span className="absolute right-0.5 top-1.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_0_2px_rgba(24,24,27,0.72)] sm:right-0 sm:top-1" />
        <AtlasMascot />
        <span className="sr-only">Atlas is ready to help</span>
      </button>

      {open ? (
        <AtlasAssistantPanel
          id={PANEL_ID}
          pathname={pathname}
          onClose={closeAndRestoreFocus}
        />
      ) : null}
    </>
  );
}
