export default function CheckoutLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-slate-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-[30rem] rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </main>
  );
}
