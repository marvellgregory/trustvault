import Image from "next/image";
import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";

const primaryLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/gift-vault", label: "Gift Vault" },
  { href: "/bill-split", label: "Bill Split" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/88 backdrop-blur-xl">
      <div className="section-shell flex h-20 items-center gap-6">
        <Link
          href="/"
          aria-label="TrustVault home"
          className="inline-flex shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
        >
          <Image
            src="/brand/trustvault/wordmark.svg"
            alt="TrustVault"
            width={220}
            height={64}
            priority
            className="h-8 w-auto"
          />
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

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
