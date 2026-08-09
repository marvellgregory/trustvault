import Link from "next/link";
import { Mail } from "lucide-react";
import {
  FaLinkedinIn,
  FaRedditAlien,
  FaTelegramPlane,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiFarcaster } from "react-icons/si";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

function comingSoonHref(feature: string) {
  return `/coming-soon?feature=${encodeURIComponent(feature)}`;
}

const columns: FooterColumn[] = [
  {
    title: "Product",
    links: [
      {
        label: "Marketplace",
        href: "/marketplace",
      },
      {
        label: "Gift Vault",
        href: "/gift-vault",
      },
      {
        label: "Bill Split",
        href: "/bill-split",
      },
      {
        label: "Dashboard",
        href: "/dashboard",
      },
      {
        label: "Wishlist",
        href: "/wishlist",
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        label: "Documentation",
        href: comingSoonHref("Documentation"),
      },
      {
        label: "Trust Center",
        href: comingSoonHref("Trust Center"),
      },
      {
        label: "Roadmap",
        href: comingSoonHref("Roadmap"),
      },
      {
        label: "Release notes",
        href: comingSoonHref("Release Notes"),
      },
      {
        label: "Help",
        href: comingSoonHref("Help Center"),
      },
    ],
  },
  {
    title: "Company",
    links: [
      {
        label: "About",
        href: comingSoonHref("About TrustVault"),
      },
      {
        label: "Contact",
        href: comingSoonHref("Contact"),
      },
      {
        label: "Privacy",
        href: comingSoonHref("Privacy Policy"),
      },
      {
        label: "Terms",
        href: comingSoonHref("Terms and Conditions"),
      },
      {
        label: "Responsible disclosure",
        href: comingSoonHref("Responsible Disclosure"),
      },
    ],
  },
];

const socialLinks = [
  {
    label: "X",
    href: "https://x.com/YoungestGrandad",
    icon: FaXTwitter,
  },
  {
    label: "LinkedIn",
    href:
      "https://www.linkedin.com/in/marvell-darlyn-gregory-702b54170",
    icon: FaLinkedinIn,
  },
  {
    label: "Telegram",
    href: "https://t.me/minerbtc1985",
    icon: FaTelegramPlane,
  },
  {
    label: "Farcaster",
    href: "https://farcaster.xyz/youngestgrandad",
    icon: SiFarcaster,
  },
  {
    label: "Reddit",
    href:
      "https://www.reddit.com/user/Beautiful_Lychee9272/",
    icon: FaRedditAlien,
  },
  {
    label: "Email",
    href: "mailto:marvellgregory85@gmail.com",
    icon: Mail,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-white">
      <div className="section-shell py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1.85fr]">
          <div className="max-w-md">
            <Link
              href="/"
              aria-label="TrustVault home"
              className="inline-flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
            >
              <span className="text-xl font-black tracking-[-0.06em]">
                <span className="text-white">
                  TRUST
                </span>

                <span className="text-[var(--brand-red)]">
                  VAULT
                </span>
              </span>
            </Link>

            <p className="mt-6 text-lg font-semibold text-zinc-100">
              Gift. Shop. Split. Verify.
            </p>

            <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">
              Programmable gifting, shared payments and Marketplace
              commerce through one connected experience built on Arc Testnet.
            </p>

            <div
              aria-label="TrustVault social links"
              className="mt-7 flex flex-wrap items-center gap-2"
            >
              {socialLinks.map(
                ({
                  label,
                  href,
                  icon: Icon,
                }) => {
                  const isEmail =
                    href.startsWith("mailto:");

                  return (
                    <Link
                      key={label}
                      href={href}
                      aria-label={label}
                      title={label}
                      target={
                        isEmail
                          ? undefined
                          : "_blank"
                      }
                      rel={
                        isEmail
                          ? undefined
                          : "noreferrer noopener"
                      }
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-[17px] w-[17px]"
                      />
                    </Link>
                  );
                },
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-9 sm:grid-cols-3">
            {columns.map((column) => (
              <section key={column.title}>
                <h2 className="text-sm font-semibold text-white">
                  {column.title}
                </h2>

                <ul className="mt-5 space-y-3.5">
                  {column.links.map(
                    ({ label, href }) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {label}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 TrustVault. All rights reserved.
          </p>

          <p>
            Built on Arc.
          </p>
        </div>
      </div>
    </footer>
  );
}



