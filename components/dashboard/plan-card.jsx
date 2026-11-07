import Link from "next/link";
import { Check } from "lucide-react";
import { formatINR } from "@/features/member/presentation";

export function PlanCard({ plan }) {
  const originalTotal = plan.baseMonthlyPrice * plan.durationMonths;
  const discountedTotal = Math.round(
    (originalTotal * (100 - plan.discountPercentage)) / 100,
  );

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm shadow-slate-950/[0.02] ${
        plan.isPopular
          ? "border-emerald-600 ring-2 ring-lime-100"
          : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{plan.name}</h3>
            {plan.isPopular && (
              <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-900 uppercase">
                Recommended
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}
          </p>
        </div>
        {plan.discountPercentage > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            {plan.discountPercentage}% off
          </span>
        )}
      </div>
      <div className="mt-5">
        <p className="text-2xl font-semibold tracking-tight text-slate-950">
          {formatINR(discountedTotal)}{" "}
          <span className="text-sm font-normal text-slate-500">total</span>
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          {plan.discountPercentage > 0 && (
            <span className="line-through">{formatINR(originalTotal)}</span>
          )}
          <span>
            {formatINR(plan.baseMonthlyPrice)} / month
          </span>
        </div>
      </div>
      <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">
        {plan.description || "No additional details provided."}
      </p>
      <ul className="mt-4 space-y-2">
        {(plan.benefits ?? []).map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600">
            <Check size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
            {benefit}
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs text-slate-500">
          <Check size={15} className="text-emerald-700" aria-hidden="true" />
          {plan.allowPartialPayment ? "Partial payment available" : "Full payment"}
        </li>
      </ul>
      <Link
        href={`/plans/${plan._id.toString()}/checkout`}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Choose plan
      </Link>
    </article>
  );
}
