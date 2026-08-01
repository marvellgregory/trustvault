import Link from "next/link";
import { Heart, Search, ShoppingBag, WalletCards } from "lucide-react";

const primaryLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/gift-vault", label: "Gift Vault" },
  { href: "/bill-split", label: "Bill Split" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="TrustVault home"
          className="shrink-0 text-xl font-semibold tracking-[-0.04em] text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
        >
          Trust<span className="text-[var(--brand-red)]">Vault</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Search TrustVault"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 sm:inline-flex"
          >
            <Search aria-hidden="true" className="h-[18px] w-[18px]" />
          </button>

          <Link
            href="/wishlist"
            aria-label="Open wishlist"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 sm:inline-flex"
          >
            <Heart aria-hidden="true" className="h-[18px] w-[18px]" />
          </Link>

          <Link
            href="/cart"
            aria-label="Open cart"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 sm:inline-flex"
          >
            <ShoppingBag aria-hidden="true" className="h-[18px] w-[18px]" />
          </Link>

          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 sm:px-5"
          >
            <WalletCards aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Connect wallet</span>
            <span className="sm:hidden">Connect</span>
          </button>
        </div>
      </div>
    </header>
  );
}
