export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 animate-pulse border-r border-slate-200 bg-white lg:block" />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 sm:px-8">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </main>
    </div>
  );
}
