import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import {
  formatDate,
  formatINR,
  getSubscriptionProgress,
  getSubscriptionStatus,
} from "@/features/member/presentation";
import { getSubscriptionExpiryNotice } from "@/features/member/expiry-notice.mjs";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function SubscriptionCard({ subscription }) {
  if (!subscription) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <CalendarDays size={20} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-950">
          No membership yet
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Your membership details will appear here once a subscription has been
          added to your account.
        </p>
        <Link
          href="/plans"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Browse available plans
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const status = getSubscriptionStatus(subscription);
  const progress = getSubscriptionProgress(subscription);
  const expiryNotice = getSubscriptionExpiryNotice(subscription);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-950/[0.03] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Current membership
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {subscription.planNameSnapshot}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Total plan price{" "}
            <span className="font-semibold text-slate-800">
              {formatINR(subscription.totalAmount)}
            </span>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {expiryNotice && (
        <p
          role={expiryNotice.type === "expired" ? "alert" : "status"}
          className={`mt-5 rounded-xl px-4 py-3 text-sm leading-6 ${
            expiryNotice.type === "expired"
              ? "bg-amber-50 text-amber-950"
              : "bg-emerald-50 text-emerald-950"
          }`}
        >
          {expiryNotice.type === "expired"
            ? `This membership expired on ${formatDate(expiryNotice.endDate)}. View available plans to renew; paying a past balance does not reactivate an expired membership.`
            : `Your membership expires in ${expiryNotice.daysRemaining} ${
                expiryNotice.daysRemaining === 1 ? "day" : "days"
              } (${formatDate(expiryNotice.endDate)}). View plans to explore renewal options.`}
          {" "}
          <Link href="/plans" className="font-semibold underline underline-offset-2">
            View plans
          </Link>
        </p>
      )}

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <CalendarDays size={18} className="mt-0.5 text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-500">Membership period</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock3 size={18} className="mt-0.5 text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-500">Next payment due</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {subscription.nextPaymentDueDate
                ? formatDate(subscription.nextPaymentDueDate)
                : "Not scheduled"}
            </p>
            {!subscription.nextPaymentDueDate && (
              <p className="mt-1 text-xs text-slate-500">
                No due date is recorded for this subscription.
              </p>
            )}
          </div>
        </div>
      </div>

      {subscription.benefitsSnapshot?.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Included benefits</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">
            {subscription.benefitsSnapshot.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Plan price</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatINR(subscription.totalAmount)}</p>
        </div>
        {subscription.balanceWaivedPaise > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {formatINR(subscription.balanceWaivedPaise)} of this balance was waived by an administrator. It was not recorded as money received.
          </p>
        )}
        <div>
          <p className="text-xs text-slate-500">Paid</p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">{formatINR(subscription.amountPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Remaining</p>
          <p className="mt-1 text-sm font-semibold text-amber-800">{formatINR(subscription.remainingBalance)}</p>
        </div>
      </div>

      <div className="mt-7 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700">Subscription progress</span>
          <span className="text-slate-500">
            {progress == null ? "Unavailable" : `${Math.round(progress)}%`}
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Subscription time elapsed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress == null ? undefined : Math.round(progress)}
        >
          {progress != null && (
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
