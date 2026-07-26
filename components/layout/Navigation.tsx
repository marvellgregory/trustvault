import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
];

export function Navigation() {
  return (
    <nav aria-label="Secondary" className="border-t border-zinc-200 bg-zinc-50/80">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4 py-3 text-sm text-zinc-600 sm:px-6 lg:px-8">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
