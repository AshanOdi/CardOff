import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Lanka Card Deals
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium text-neutral-600">
          <Link href="/" className="hover:text-emerald-700">
            All offers
          </Link>
          <Link href="/compare" className="hover:text-emerald-700">
            Compare banks
          </Link>
        </div>
      </nav>
    </header>
  );
}
