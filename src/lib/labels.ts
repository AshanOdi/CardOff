/**
 * Display labels for enum values shown in the UI.
 */
import type { Bank, Category, OfferType, Sort } from "./schema/offer";

export const BANK_LABELS: Record<Bank, string> = {
  hnb: "HNB",
  commercial_bank: "Commercial Bank",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  dining: "Dining",
  travel: "Hotels & Travel",
  shopping: "Shopping",
  groceries: "Groceries",
  fuel: "Fuel",
  health: "Health",
  entertainment: "Entertainment",
  online: "Online",
  other: "Other",
};

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  percentage: "Discounts",
  cashback: "Cashback",
  installment: "0% Installments",
  other: "Other",
};

export const SORT_LABELS: Record<Sort, string> = {
  best: "Biggest discount",
  ending: "Ending soon",
  newest: "Newest",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Colombo",
});

export function formatDate(date: Date | string | undefined): string | undefined {
  return date ? dateFmt.format(new Date(date)) : undefined;
}

/** Whole days from now until `date` (negative if past). */
export function daysUntil(date: Date | string, now = new Date()): number {
  return Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000);
}
