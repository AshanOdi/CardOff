export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12" aria-busy="true">
      <div className="mb-8 h-9 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="mb-6 h-10 w-full max-w-2xl animate-pulse rounded-lg bg-neutral-200" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="h-72 animate-pulse rounded-xl border border-neutral-200 bg-white" />
        ))}
      </ul>
    </main>
  );
}
