import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { OfferCard } from "@/components/OfferCard";
import { Pagination } from "@/components/Pagination";
import { getOffers, parseFilters } from "@/lib/offers";

// Always read fresh from the DB — the scraper updates it daily.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const { offers, total, page, totalPages } = await getOffers(filters);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Lanka Card Deals</h1>
        <p className="mt-2 text-neutral-600">
          Current Sri Lankan credit card offers, pulled straight from the banks every day.
        </p>
      </header>

      <Suspense>
        <FilterBar />
      </Suspense>

      <p className="mb-4 text-sm text-neutral-500">
        {total} offer{total === 1 ? "" : "s"}
      </p>

      {offers.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <p className="font-medium">No offers match these filters.</p>
          <p className="mt-1 text-sm text-neutral-500">Try a different category or clear the search.</p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {offers.map((offer) => (
          <li key={offer._id} className="flex">
            <OfferCard offer={offer} />
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        params={{ bank: filters.bank, category: filters.category, type: filters.type, q: filters.q }}
      />
    </main>
  );
}
