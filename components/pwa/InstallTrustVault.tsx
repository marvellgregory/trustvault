"use client";

import Image from "next/image";
import {
  Download,
  Share2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface InstallTrustVaultProps {
  className?: string;
  variant?: "header" | "nav";
}

function isIosDevice() {
  const classicIos =
    /iPad|iPhone|iPod/i.test(
      navigator.userAgent,
    );

  const modernIpad =
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1;

  return classicIos || modernIpad;
}

function isStandaloneMode() {
  const navigatorWithStandalone =
    navigator as NavigatorWithStandalone;

  return (
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function InstallTrustVault({
  className = "",
  variant = "header",
}: InstallTrustVaultProps) {
  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null,
    );

  const [
    isIos,
    setIsIos,
  ] =
    useState(false);

  const [
    isStandalone,
    setIsStandalone,
  ] =
    useState(true);

  const [
    guideOpen,
    setGuideOpen,
  ] =
    useState(false);

  const [
    isPrompting,
    setIsPrompting,
  ] =
    useState(false);

  useEffect(() => {
    /*
     * Browser-only environment detection runs after hydration.
     * Keeping the first server/client render identical avoids
     * hydration mismatches and avoids synchronous state writes
     * directly in the effect body.
     */
    const detectionFrame =
      window.requestAnimationFrame(() => {
        setIsStandalone(
          isStandaloneMode(),
        );

        setIsIos(
          isIosDevice(),
        );
      });

    const handleBeforeInstallPrompt =
      (event: Event) => {
        event.preventDefault();

        setDeferredPrompt(
          event as BeforeInstallPromptEvent,
        );
      };

    const handleAppInstalled =
      () => {
        setDeferredPrompt(null);
        setGuideOpen(false);
        setIsStandalone(true);
      };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled,
    );

    return () => {
      window.cancelAnimationFrame(
        detectionFrame,
      );

      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled,
      );
    };
  }, []);

  const canInstall =
    !isStandalone &&
    (
      isIos ||
      deferredPrompt !== null
    );

  if (!canInstall) {
    return null;
  }

  async function handleInstall() {
    if (isPrompting) {
      return;
    }

    if (isIos) {
      setGuideOpen(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    setIsPrompting(true);

    try {
      await deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      /*
       * The browser install event is single use.
       * Clear it after either acceptance or dismissal.
       */
      setDeferredPrompt(null);
    }
    finally {
      setIsPrompting(false);
    }
  }

  const buttonClassName =
    variant === "nav"
      ? "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
      : "inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-wait disabled:opacity-60";

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        disabled={isPrompting}
        aria-haspopup={
          isIos
            ? "dialog"
            : undefined
        }
        aria-expanded={
          isIos
            ? guideOpen
            : undefined
        }
        className={`${buttonClassName} ${className}`}
      >
        <Download
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
        />

        <span>
          {isPrompting
            ? "Opening install"
            : "Install TrustVault"}
        </span>
      </button>

      {guideOpen ? (
        <>
          <button
            type="button"
            aria-label="Close install instructions"
            className="fixed inset-0 z-[80] cursor-default bg-zinc-950/20 backdrop-blur-[1px]"
            onClick={() => {
              setGuideOpen(false);
            }}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="trustvault-install-title"
            className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:bottom-6"
          >
            <div className="flex items-start gap-4">
              <Image
                src="/brand/trustvault/icon-192.png"
                alt=""
                width={52}
                height={52}
                className="h-[52px] w-[52px] shrink-0 rounded-2xl"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  TrustVault app
                </p>

                <h2
                  id="trustvault-install-title"
                  className="mt-1 text-lg font-bold tracking-tight text-zinc-950"
                >
                  Add TrustVault to your Home Screen
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close install instructions"
                onClick={() => {
                  setGuideOpen(false);
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <X
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
              <ol className="space-y-3 text-sm leading-6 text-zinc-700">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    1
                  </span>

                  <span>
                    Open the browser Share menu.
                  </span>
                </li>

                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    2
                  </span>

                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    Tap
                    <Share2
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                    Share, then choose Add to Home Screen.
                  </span>
                </li>

                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    3
                  </span>

                  <span>
                    Confirm by tapping Add.
                  </span>
                </li>
              </ol>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              TrustVault will appear on your Home Screen with the ape shield icon and open in its standalone app view.
            </p>

            <button
              type="button"
              onClick={() => {
                setGuideOpen(false);
              }}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </section>
        </>
      ) : null}
    </>
  );
}
