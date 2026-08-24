import Link from "next/link";

import { InstallTrustVault } from "@/components/pwa/InstallTrustVault";

const mobileLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/gift-vault", label: "Gift Vault" },
  { href: "/bill-split", label: "Bill Split" },
  { href: "/coming-soon?feature=Swap", label: "Swap" },
  { href: "/dashboard", label: "Activity" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/cart", label: "Cart" },
];

export function Navigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="min-w-0 overflow-hidden border-b border-zinc-200 bg-white lg:hidden"
    >
      <ul className="mx-auto grid w-full max-w-7xl grid-cols-4 gap-1 px-3 py-2 sm:px-7">
        {mobileLinks.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className="flex min-h-9 w-full items-center justify-center rounded-full px-1.5 text-center text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {link.label}
            </Link>
          </li>
        ))}

        <li className="flex min-w-0 items-center justify-center">
          <InstallTrustVault variant="nav" />
        </li>
      </ul>
    </nav>
  );
}