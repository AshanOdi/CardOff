import type { Metadata } from "next";
import { getMerchantComparisons } from "@/lib/compare";
import { BANK_LABELS, formatDate } from "@/lib/labels";
import { BANKS, type Offer } from "@/lib/schema/offer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare banks · Lanka Card Deals",
  description: "Merchants with offers from more than one Sri Lankan bank, side by side.",
};

export default async function ComparePage() {
  const comparisons = await getMerchantComparisons();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compare banks</h1>
        <p className="mt-2 text-neutral-600">
          {comparisons.length} merchants have offers from more than one bank right now. The biggest discount for each is
          highlighted.
        </p>
      </header>

      {comparisons.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center text-neutral-500">
          No merchants are offered by more than one bank right now.
        </p>
      )}

      <ul className="space-y-4">
        {comparisons.map((c) => {
          return (
            <li key={c.key} id={c.key} className="scroll-mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">{c.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {BANKS.filter((b) => c.banks.includes(b)).map((bank) => (
                  <BankColumn
                    key={bank}
                    label={BANK_LABELS[bank]}
                    offers={c.offers.filter((o) => o.bank === bank)}
                    bestPercentage={c.bestPercentage}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function BankColumn({ label, offers, bestPercentage }: { label: string; offers: Offer[]; bestPercentage?: number }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <ul className="space-y-2">
        {offers.map((o) => {
          // Ties are all marked best — no point pretending one 25% beats another.
          const isBest = bestPercentage !== undefined && o.discountPercentage === bestPercentage;
          return (
            <li key={o._id}>
              <a
                href={o.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-md border bg-white p-3 transition hover:shadow-sm ${
                  isBest ? "border-emerald-500 ring-1 ring-emerald-500" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-900">{o.discountLabel}</span>
                  {isBest && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white">
                      Best
                    </span>
                  )}
                </div>
                {o.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{o.description}</p>}
                {o.validUntil && (
                  <p className="mt-1 text-xs text-neutral-500">Valid until {formatDate(o.validUntil)}</p>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
