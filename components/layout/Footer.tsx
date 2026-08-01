import Link from "next/link";
import { Mail, Send } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      ["Marketplace", "/marketplace"],
      ["Gift Vault", "/gift-vault"],
      ["Bill Split", "/bill-split"],
      ["Dashboard", "/dashboard"],
      ["Wishlist", "/wishlist"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["Trust Center", "/trust"],
      ["Roadmap", "/roadmap"],
      ["Release notes", "/releases"],
      ["Help", "/help"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Responsible disclosure", "/security"],
    ],
  },
];

const socialLinks = [
  { label: "X", href: "#", text: "X" },
  {
    label: "GitHub",
    href: "https://github.com/marvellgregory/trustvault",
    text: "GH",
  },
  { label: "LinkedIn", href: "#", text: "in" },
  { label: "Telegram", href: "#", icon: Send },
  { label: "Email", href: "/contact", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1.85fr]">
          <div className="max-w-md">
            <Link
              href="/"
              className="text-2xl font-semibold tracking-[-0.045em] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              Trust<span className="text-[#df5b67]">Vault</span>
            </Link>

            <p className="mt-5 text-lg font-medium text-zinc-100">
              Gift. Shop. Split. Protect.
            </p>

            <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
              A consumer-friendly testnet prototype for programmable gifting,
              shared payments and trusted commerce using USDC on Arc.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {socialLinks.map(({ label, href, text, icon: Icon }) => {
                const isExternal = href.startsWith("http");

                return (
                  <Link
                    key={label}
                    href={href}
                    aria-label={label}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {Icon ? (
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="text-[11px] font-semibold tracking-tight"
                      >
                        {text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-9 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-white">
                  {column.title}
                </h2>

                <ul className="mt-5 space-y-3.5">
                  {column.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TrustVault. All rights reserved.</p>
          <p>Built on Arc. Testnet prototype.</p>
        </div>
      </div>
    </footer>
  );
}
