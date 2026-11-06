export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-16 animate-pulse border-b border-slate-200 bg-white" />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </main>
    </div>
  );
}
