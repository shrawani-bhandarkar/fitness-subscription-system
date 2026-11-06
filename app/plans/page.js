import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { PlanCard } from "@/components/dashboard/plan-card";
import { getActivePlans } from "@/features/member/data";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await getActivePlans();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
        <div className="mt-9 flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Dumbbell size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
              Membership options
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              Find a plan that fits
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Compare published memberships and choose the option that fits
              your goals. Prices are shown in INR.
            </p>
          </div>
        </div>

        {plans.length === 0 ? (
          <section className="mt-9 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-slate-900">
              No plans are available yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Active plans will appear here when they are published.
            </p>
          </section>
        ) : (
          <section className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan._id.toString()} plan={plan} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
