import Link from "next/link";

import { InstallTrustVault } from "@/components/pwa/InstallTrustVault";

const mobileLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/gift-vault", label: "Gift Vault" },
  { href: "/bill-split", label: "Bill Split" },
  { href: "/dashboard", label: "Activity" },
  { href: "/cart", label: "Cart" },
];

export function Navigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="min-w-0 overflow-hidden border-b border-zinc-200 bg-white lg:hidden"
    >
      <ul className="no-scrollbar mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto overscroll-x-contain px-4 py-2 sm:px-7">
        {mobileLinks.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              className="inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <InstallTrustVault variant="nav" />
        </li>
      </ul>
    </nav>
  );
}
