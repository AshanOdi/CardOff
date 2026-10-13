/**
 * parseDiscount — classify free-text offer wording into structured fields.
 * Simplified from card-max's 8-type classifier to 4 types.
 *
 * Priority (first match wins):
 *   1. cashback     "10% cashback", "cashback up to Rs. 5,000"
 *   2. percentage   any non-zero "N%" — "Up to 50% off", "20% discount"
 *   3. installment  "0% installments", "06 months 0% installment plans"
 *   4. other
 *
 * Combined offers ("20% off + 0% installments") count as percentage,
 * since the discount is the headline benefit.
 */
import type { OfferType } from "../../src/lib/schema/offer";
import { squish } from "./text";

export interface ParsedDiscount {
  offerType: OfferType;
  discountLabel: string;
  discountPercentage?: number;
}

const PERCENT_RE = /(up\s+to\s+)?(\d{1,3}(?:\.\d+)?)\s*%/gi;

export function parseDiscount(raw: string): ParsedDiscount {
  const text = squish(raw);
  const lower = text.toLowerCase();
  const maxPct = maxNonZeroPercentage(text);

  if (/cash\s*back/.test(lower)) {
    return {
      offerType: "cashback",
      discountPercentage: maxPct,
      discountLabel: maxPct ? `${upTo(text)}${maxPct}% cashback` : "Cashback",
    };
  }

  if (maxPct !== undefined) {
    return {
      offerType: "percentage",
      discountPercentage: maxPct,
      discountLabel: `${upTo(text)}${maxPct}% off`,
    };
  }

  if (/\b0\s*%|instal{1,2}ments?|interest[\s-]*free/.test(lower)) {
    const months = maxInstallmentMonths(lower);
    return {
      offerType: "installment",
      discountLabel: months ? `Up to ${months} months 0% installments` : "0% installments",
    };
  }

  return { offerType: "other", discountLabel: text.slice(0, 60) || "Special offer" };
}

/** Largest non-zero percentage in the text (0% = installment, not a discount). */
function maxNonZeroPercentage(text: string): number | undefined {
  const values = [...text.matchAll(PERCENT_RE)].map((m) => Number(m[2])).filter((n) => n > 0 && n <= 100);
  return values.length ? Math.max(...values) : undefined;
}

/** "Up to " if the largest percentage is phrased as an upper bound. */
function upTo(text: string): string {
  const max = maxNonZeroPercentage(text);
  const hit = [...text.matchAll(PERCENT_RE)].find((m) => Number(m[2]) === max);
  return hit?.[1] ? "Up to " : "";
}

/** "Up to 06 months" / "3, 6, 12 & 24 months" → largest month count. */
function maxInstallmentMonths(lower: string): number | undefined {
  const runs = [...lower.matchAll(/((?:\d{1,2}\s*(?:,|&|and)?\s*)+)months?/g)];
  const nums = runs.flatMap((m) => m[1].match(/\d{1,2}/g) ?? []).map(Number).filter((n) => n > 0);
  return nums.length ? Math.max(...nums) : undefined;
}
