import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-950">
          TrustVault
        </Link>
        <nav aria-label="Primary" className="hidden text-sm text-zinc-600 sm:block">
          <ul className="flex items-center gap-6">
            <li>
              <Link href="/" className="transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2">
                Home
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
