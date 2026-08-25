import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

type InformationSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  content?: ReactNode;
};

type InformationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: readonly InformationSection[];
  updated?: string;
  backHref?: string;
  backLabel?: string;
};

export function InformationPage({
  eyebrow,
  title,
  description,
  sections,
  updated,
  backHref = "/",
  backLabel = "Back to TrustVault",
}: InformationPageProps) {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="border-b border-zinc-200 bg-white">
        <div className="section-shell py-14 sm:py-20">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-4 w-4"
            />

            {backLabel}
          </Link>

          <div className="mt-10 max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-red)]">
              {eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-600 sm:text-lg">
              {description}
            </p>

            {updated ? (
              <p className="mt-5 text-sm text-zinc-500">
                Last updated: {updated}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-6">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-zinc-950 sm:text-2xl">
                  {section.title}
                </h2>

                {section.paragraphs?.map(
                  (paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-4 text-[15px] leading-7 text-zinc-600"
                    >
                      {paragraph}
                    </p>
                  ),
                )}

                {section.bullets?.length ? (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map(
                      (bullet) => (
                        <li
                          key={bullet}
                          className="flex gap-3 text-[15px] leading-7 text-zinc-600"
                        >
                          <ArrowRight
                            aria-hidden="true"
                            className="mt-1.5 h-4 w-4 shrink-0 text-[var(--brand-red)]"
                          />

                          <span>{bullet}</span>
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}

                {section.content ? (
                  <div className="mt-6">
                    {section.content}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}