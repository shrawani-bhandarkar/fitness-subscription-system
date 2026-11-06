export default function PlansLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="mt-10 h-10 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
