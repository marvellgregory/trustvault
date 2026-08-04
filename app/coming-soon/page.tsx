import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Sparkles,
} from "lucide-react";

type ComingSoonPageProps = {
  searchParams: Promise<{
    feature?: string;
  }>;
};

export default async function ComingSoonPage({
  searchParams,
}: ComingSoonPageProps) {
  const { feature } = await searchParams;

  const featureName =
    typeof feature === "string" &&
    feature.trim().length > 0
      ? feature.trim()
      : "This TrustVault experience";

  return (
    <main className="min-h-[70vh] bg-zinc-50">
      <section className="section-shell flex min-h-[70vh] items-center justify-center py-20">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white px-7 py-14 text-center shadow-[var(--tv-shadow-md)] sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--brand-red)] to-transparent"
          />

          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-950 text-white">
            <Sparkles
              aria-hidden="true"
              className="h-7 w-7"
            />
          </span>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
            TrustVault ecosystem
          </p>

          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-5xl">
            {featureName} is under development.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-zinc-600">
            This part of the TrustVault ecosystem is being prepared
            carefully. Stay tuned for the next product update.
          </p>

          <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700">
            <Clock3
              aria-hidden="true"
              className="h-4 w-4"
            />

            Under Development — Stay Tuned!
          </div>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400"
            >
              <ArrowLeft
                aria-hidden="true"
                className="h-4 w-4"
              />

              Return home
            </Link>

            <Link
              href="/marketplace"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
