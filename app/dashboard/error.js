"use client";

export default function DashboardError({ reset }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-5">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">
          Dashboard couldn&apos;t load
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          We couldn&apos;t retrieve your membership data. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
