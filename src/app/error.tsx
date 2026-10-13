"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Couldn&apos;t load offers</h1>
      <p className="mt-2 text-neutral-600">Something went wrong talking to the database.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Try again
      </button>
    </main>
  );
}
