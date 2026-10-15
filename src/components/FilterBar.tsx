"use client";

/**
 * Filters live in the URL (?category=dining&type=percentage&q=pizza), so
 * filtered views are shareable, survive refresh, and work with the back button.
 * The server page reads the same params — no client-side data fetching.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BANKS, CATEGORIES, OFFER_TYPES, SORTS } from "@/lib/schema/offer";
import { BANK_LABELS, CATEGORY_LABELS, OFFER_TYPE_LABELS, SORT_LABELS } from "@/lib/labels";

const SELECT_CLASS =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  // Keep the box in sync when the URL changes elsewhere (clear button, back/forward).
  useEffect(() => setQ(urlQ), [urlQ]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // new filter → back to page 1
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounce the search box so we don't navigate on every keystroke.
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => update("q", q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["bank", "category", "type", "q"].some((k) => params.get(k));

  return (
    <div
      className={`mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${pending ? "opacity-60" : ""}`}
      aria-busy={pending}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search merchant…"
        aria-label="Search merchant"
        className={`${SELECT_CLASS} sm:w-64`}
      />

      <select
        aria-label="Category"
        value={params.get("category") ?? ""}
        onChange={(e) => update("category", e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>

      <select
        aria-label="Offer type"
        value={params.get("type") ?? ""}
        onChange={(e) => update("type", e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All offer types</option>
        {OFFER_TYPES.map((t) => (
          <option key={t} value={t}>
            {OFFER_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      <select
        aria-label="Bank"
        value={params.get("bank") ?? ""}
        onChange={(e) => update("bank", e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">All banks</option>
        {BANKS.map((b) => (
          <option key={b} value={b}>
            {BANK_LABELS[b]}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort by"
        value={params.get("sort") ?? "best"}
        // "best" is the default, so keep it out of the URL.
        onChange={(e) => update("sort", e.target.value === "best" ? "" : e.target.value)}
        className={`${SELECT_CLASS} sm:ml-auto`}
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
