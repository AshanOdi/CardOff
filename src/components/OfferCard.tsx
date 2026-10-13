import type { Offer } from "@/lib/schema/offer";
import { BANK_LABELS, CATEGORY_LABELS, daysUntil, formatDate } from "@/lib/labels";

const BADGE_STYLES: Record<Offer["offerType"], string> = {
  percentage: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cashback: "bg-sky-50 text-sky-700 ring-sky-600/20",
  installment: "bg-violet-50 text-violet-700 ring-violet-600/20",
  other: "bg-neutral-100 text-neutral-700 ring-neutral-500/20",
};

export function OfferCard({ offer }: { offer: Offer }) {
  const endsIn = offer.validUntil ? daysUntil(offer.validUntil) : undefined;
  const endingSoon = endsIn !== undefined && endsIn <= 7;

  return (
    <a
      href={offer.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <div className="flex h-32 items-center justify-center bg-neutral-50 p-4">
        {offer.imageUrl ? (
          // Bank-hosted logos of unknown size — plain <img> avoids next/image domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.merchant ?? ""}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-lg font-semibold text-neutral-400">{offer.merchant}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
          <span className="font-medium">{BANK_LABELS[offer.bank]}</span>
          <span>{CATEGORY_LABELS[offer.category]}</span>
        </div>

        <span
          className={`w-fit rounded-md px-2 py-0.5 text-sm font-semibold ring-1 ring-inset ${BADGE_STYLES[offer.offerType]}`}
        >
          {offer.discountLabel}
        </span>

        <h2 className="font-semibold leading-snug text-neutral-900 group-hover:text-emerald-700">
          {offer.merchant ?? offer.title}
        </h2>
        {offer.description && <p className="line-clamp-2 text-sm text-neutral-600">{offer.description}</p>}

        {offer.validUntil && (
          <p className={`mt-auto pt-2 text-xs ${endingSoon ? "font-medium text-amber-700" : "text-neutral-500"}`}>
            {endingSoon ? `Ends in ${endsIn} day${endsIn === 1 ? "" : "s"}` : `Valid until ${formatDate(offer.validUntil)}`}
          </p>
        )}
      </div>
    </a>
  );
}
