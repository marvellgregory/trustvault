"use client";

import Link from "next/link";
import {
  Bell,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fetchNotifications,
  type TrustVaultNotification,
} from "@/lib/aws/notification-client";

function formatNotificationTime(
  value: string,
) {
  const date =
    new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function NotificationBell() {
  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loaded, setLoaded] =
    useState(false);

  const [notifications, setNotifications] =
    useState<TrustVaultNotification[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const result =
      await fetchNotifications();

    if (result.ok) {
      setNotifications(
        result.notifications,
      );
      setLoaded(true);
      setLoading(false);
      return;
    }

    /*
     * A missing authenticated session is normal for a public
     * TrustVault visitor. Keep the global header quiet instead
     * of turning authentication state into an error banner.
     */
    if (
      result.status === 401 ||
      result.status === 403
    ) {
      setNotifications([]);
      setLoaded(true);
      setLoading(false);
      return;
    }

    setError(
      "Notifications are temporarily unavailable.",
    );
    setLoaded(true);
    setLoading(false);
  }

  async function togglePanel() {
    const nextOpen =
      !open;

    setOpen(nextOpen);

    if (
      nextOpen &&
      !loaded
    ) {
      await loadNotifications();
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  const unreadCount =
    notifications.length;

  return (
    <div
      ref={containerRef}
      className="relative hidden sm:block"
    >
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          void togglePanel();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
      >
        <Bell
          aria-hidden="true"
          className="h-[18px] w-[18px]"
        />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--tv-brand)] ring-2 ring-white"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[var(--tv-shadow-md)]"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Notifications
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Gift Vault updates and account activity
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && (
              <div
                role="status"
                className="flex min-h-32 items-center justify-center gap-2 px-5 text-sm text-zinc-500"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
                Loading notifications…
              </div>
            )}

            {!loading &&
              error && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-medium text-zinc-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      void loadNotifications();
                    }}
                    className="mt-4 inline-flex min-h-10 items-center rounded-full border border-zinc-200 px-4 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    Try again
                  </button>
                </div>
              )}

            {!loading &&
              !error &&
              loaded &&
              notifications.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
                    <Bell
                      aria-hidden="true"
                      className="h-5 w-5 text-zinc-500"
                    />
                  </span>

                  <p className="mt-4 text-sm font-semibold text-zinc-900">
                    You&apos;re all caught up
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                    New Gift Vault and account updates will appear here.
                  </p>
                </div>
              )}

            {!loading &&
              !error &&
              notifications.map(
                (notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onOpen={() =>
                      setOpen(false)
                    }
                  />
                ),
              )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: TrustVaultNotification;
  onOpen: () => void;
}) {
  const timestamp =
    formatNotificationTime(
      notification.createdAt,
    );

  return (
    <Link
      href={notification.actionPath}
      onClick={onOpen}
      className="group block border-b border-zinc-100 px-5 py-4 transition last:border-b-0 hover:bg-zinc-50 focus:outline-none focus-visible:bg-zinc-50"
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--tv-brand)]"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-zinc-950">
            {notification.title}
          </p>

          {notification.body && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
              {notification.body}
            </p>
          )}

          {timestamp && (
            <p className="mt-2 text-[11px] font-medium text-zinc-400">
              {timestamp}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
