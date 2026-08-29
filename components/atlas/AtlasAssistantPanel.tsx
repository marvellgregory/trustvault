"use client";

import {
  ArrowUp,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  Minimize2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "wagmi";

import { AtlasMascot } from "@/components/atlas/AtlasMascot";
import {
  createBrowserBillSplitReadAdapter,
  createGiftReadAdapter,
  createMarketplaceOrderReadAdapter,
  createReceiptReadAdapter,
} from "@/lib/atlas/atlas-customer-adapters";
import {
  createAtlasAuthenticatedCustomer,
  type AtlasAuthenticatedCustomer,
} from "@/lib/atlas/atlas-customer-context";
import {
  clearAtlasConversationContext,
  createAtlasConversationContext,
  type AtlasConversationContext,
} from "@/lib/atlas/atlas-conversation-context";
import { AtlasOrchestrator } from "@/lib/atlas/atlas-orchestrator";
import {
  ATLAS_SURFACE_SECURITY_NOTICE,
  getAtlasStarterPrompts,
} from "@/lib/atlas/atlas-surface";
import type {
  AtlasAction,
  AtlasResponsePlan,
  AtlasSuggestion,
} from "@/lib/atlas/atlas-types";
import type { AtlasVisualState } from "@/lib/atlas/atlas-visual-state";
import { getTrustVaultSession } from "@/lib/aws/auth-client";
import { sessionMatchesConnectedWallet } from "@/lib/aws/session-types";

type AtlasAssistantPanelProps = Readonly<{
  id: string;
  pathname: string;
  onClose: () => void;
}>;

type AtlasMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  plan?: AtlasResponsePlan;
};

const orchestrator = new AtlasOrchestrator();

function isExternalAction(action: AtlasAction) {
  return action.type === "external-navigation" ||
    (action.type === "support" && !action.destination.startsWith("/"));
}

export function AtlasAssistantPanel({
  id,
  pathname,
  onClose,
}: AtlasAssistantPanelProps) {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<number | null>(null);
  const messageIdRef = useRef(1);
  const conversationRef = useRef<AtlasConversationContext>(
    clearAtlasConversationContext(),
  );
  const [input, setInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<AtlasAuthenticatedCustomer | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [visualState, setVisualState] = useState<AtlasVisualState>("greeting");
  const [messages, setMessages] = useState<AtlasMessage[]>([
    {
      id: 0,
      role: "assistant",
      text: "I'm Atlas. I can help you understand TrustVault, find the right place, and explain what to review before you act.",
    },
  ]);

  const activeCustomer = useMemo(
    () =>
      customer &&
      address &&
      chainId === customer.chainId &&
      address.toLowerCase() === customer.walletAddress.toLowerCase()
        ? customer
        : null,
    [address, chainId, customer],
  );

  const customerAdapters = useMemo(
    () =>
      activeCustomer
        ? {
            marketplaceOrders: createMarketplaceOrderReadAdapter(activeCustomer),
            receipts: createReceiptReadAdapter(activeCustomer),
            gifts: createGiftReadAdapter(activeCustomer),
            billSplits: createBrowserBillSplitReadAdapter(activeCustomer),
          }
        : undefined,
    [activeCustomer],
  );

  useEffect(() => {
    inputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const shouldLockScroll = window.matchMedia("(max-width: 639px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (shouldLockScroll) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (responseTimerRef.current !== null) {
        window.clearTimeout(responseTimerRef.current);
      }
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;

    void getTrustVaultSession()
      .then((session) => {
        if (!active) return;
        const matches = Boolean(
          session &&
            address &&
            chainId &&
            sessionMatchesConnectedWallet(session, address, chainId),
        );
        setCustomer(
          matches && session
            ? createAtlasAuthenticatedCustomer(session)
            : null,
        );
      })
      .catch(() => {
        // General grounded guidance remains available without the optional session API.
        if (active) setCustomer(null);
      })
      .finally(() => {
        if (active) setSessionChecked(true);
      });

    return () => {
      active = false;
    };
  }, [address, chainId]);

  useEffect(() => {
    conversationRef.current = clearAtlasConversationContext();
  }, [address, chainId, activeCustomer?.walletAddress]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, thinking]);

  function settleVisualState(next: AtlasVisualState) {
    setVisualState(next);
    if (responseTimerRef.current !== null) {
      window.clearTimeout(responseTimerRef.current);
    }
    responseTimerRef.current = window.setTimeout(() => {
      setVisualState("idle");
    }, 2200);
  }

  async function sendPrompt(prompt: string) {
    const message = prompt.trim();
    if (!message || thinking) return;

    const userMessage: AtlasMessage = {
      id: messageIdRef.current++,
      role: "user",
      text: message,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLastPrompt(message);
    setError(null);
    setThinking(true);
    setVisualState("thinking");

    try {
      const plan = await orchestrator.plan(message, {
        pathname,
        isAuthenticated: Boolean(activeCustomer),
        hasConnectedWallet: isConnected,
        conversation: conversationRef.current,
        ...(activeCustomer ? { authenticatedCustomer: activeCustomer } : {}),
        ...(customerAdapters ? { customerAdapters } : {}),
      });

      conversationRef.current = createAtlasConversationContext(plan);
      setMessages((current) => [
        ...current,
        {
          id: messageIdRef.current++,
          role: "assistant",
          text: plan.answer,
          plan,
        },
      ]);
      settleVisualState(plan.visualState ?? "speaking");
    } catch {
      setError("Atlas couldn't complete that request. Your TrustVault data was not changed.");
      settleVisualState("error");
    } finally {
      setThinking(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  function navigate(action: AtlasAction) {
    if (action.type !== "navigate") return;
    router.push(action.route);
    onClose();
  }

  function renderAction(action: AtlasAction, key: string) {
    const className =
      "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950";

    if (action.type === "navigate") {
      return (
        <button key={key} type="button" onClick={() => navigate(action)} className={className}>
          {action.label}
        </button>
      );
    }

    if (action.type === "ask-atlas") {
      return (
        <button
          key={key}
          type="button"
          onClick={() => void sendPrompt(action.prompt)}
          disabled={thinking}
          className={className}
        >
          {action.label}
        </button>
      );
    }

    return (
      <Link
        key={key}
        href={action.destination}
        target={isExternalAction(action) ? "_blank" : undefined}
        rel={isExternalAction(action) ? "noreferrer noopener" : undefined}
        className={className}
        onClick={action.destination.startsWith("/") ? onClose : undefined}
      >
        {action.label}
        {isExternalAction(action) ? <ExternalLink aria-hidden="true" className="h-3 w-3" /> : null}
      </Link>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] sm:pointer-events-none" aria-hidden={false}>
      <button
        type="button"
        aria-label="Close Atlas"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px] sm:hidden"
      />

      <section
        id={id}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="atlas-panel pointer-events-auto absolute inset-x-0 bottom-0 flex h-[min(46rem,calc(100dvh-env(safe-area-inset-top)))] flex-col overflow-hidden rounded-t-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-lg)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-[24rem] sm:rounded-[2rem] sm:border-zinc-300/80 sm:bg-[#f7f7f8] sm:shadow-[0_28px_80px_rgba(24,24,27,0.18),0_2px_12px_rgba(24,24,27,0.08)]"
      >
        <header className="relative overflow-hidden border-b border-white/10 bg-zinc-950 px-5 pb-4 pt-4 text-white sm:bg-[linear-gradient(145deg,#18181b_0%,#27272a_68%,#321f22_100%)]">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--tv-brand)]/25 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-[4.5rem] w-[4.5rem] overflow-visible rounded-2xl border border-white/10 bg-white/[0.06] sm:rounded-full sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <AtlasMascot state={visualState} size="panel" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 id={`${id}-title`} className="text-lg font-bold tracking-tight">
                  Atlas
                </h2>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                  Guide
                </span>
              </div>
              <p id={`${id}-description`} className="mt-1 text-xs leading-5 text-zinc-400">
                TrustVault guidance. You approve every wallet action.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize Atlas"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Minimize2 aria-hidden="true" className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-5 py-2.5 text-[11px] text-zinc-600 sm:border-zinc-200/80 sm:bg-zinc-100/90">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />
            {activeCustomer ? "Secure customer context" : "General TrustVault guidance"}
          </span>
          <span>{sessionChecked ? (activeCustomer ? "Signed in" : "No sign-in needed") : "Checking access..."}</span>
        </div>

        <div
          className="no-scrollbar flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:bg-[linear-gradient(180deg,#f4f4f5_0%,#fafafa_18%,#f7f7f8_100%)] sm:px-5"
          aria-live="polite"
          aria-busy={thinking}
        >
          {messages.map((message) => (
            <article
              key={message.id}
              className={message.role === "user" ? "ml-auto max-w-[86%]" : "max-w-[92%]"}
            >
              <div
                className={
                  message.role === "user"
                    ? "rounded-[1.35rem] rounded-br-md bg-zinc-950 px-4 py-3 text-sm leading-6 text-white"
                    : "rounded-[1.35rem] rounded-bl-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-800 sm:border-zinc-200/90 sm:bg-white sm:shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
                }
              >
                {message.text}
              </div>

              {message.plan?.sourceLabels?.length ? (
                <p className="mt-2 px-1 text-[11px] font-medium text-zinc-500">
                  {message.plan.sourceLabels.map((source) => source.label).join(" / ")}
                </p>
              ) : null}

              {message.plan?.suggestions?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.plan.suggestions.map((suggestion: AtlasSuggestion) =>
                    renderAction(suggestion.action, `${message.id}-${suggestion.id}`),
                  )}
                </div>
              ) : null}

              {message.plan?.disambiguation?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.plan.disambiguation.slice(0, 4).map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => void sendPrompt(choice.label)}
                      className="min-h-9 rounded-full border border-zinc-200 bg-white px-3 text-left text-xs font-semibold text-zinc-800 transition hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {messages.length === 1 ? (
            <div className="pt-1">
              <p className="px-1 text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                A good place to start
              </p>
              <div className="mt-2 grid gap-2">
                {getAtlasStarterPrompts(pathname).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendPrompt(prompt)}
                    className="min-h-11 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-left text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {thinking ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600" role="status">
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              Atlas is checking TrustVault...
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void sendPrompt(lastPrompt)}
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          ) : null}
          <div ref={conversationEndRef} />
        </div>

        <form onSubmit={submit} className="border-t border-zinc-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:bg-zinc-100/90 sm:px-5 sm:pb-5 sm:shadow-[0_-10px_28px_rgba(24,24,27,0.04)]">
          <label htmlFor={`${id}-input`} className="sr-only">
            Ask Atlas about TrustVault
          </label>
          <div className="flex items-center gap-2 rounded-[1.35rem] border border-zinc-300 bg-white p-1.5 pl-4 shadow-sm transition focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-950/10">
            <input
              ref={inputRef}
              id={`${id}-input`}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (event.target.value) setVisualState("listening");
              }}
              disabled={thinking}
              autoComplete="off"
              maxLength={500}
              placeholder="Ask about TrustVault..."
              className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 disabled:cursor-wait"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Send message to Atlas"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--tv-brand)] text-white transition hover:bg-[var(--tv-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {thinking ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowUp aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] leading-4 text-zinc-500">
            <LockKeyhole aria-hidden="true" className="h-3 w-3" />
            {ATLAS_SURFACE_SECURITY_NOTICE}
          </p>
        </form>
      </section>
    </div>
  );
}
