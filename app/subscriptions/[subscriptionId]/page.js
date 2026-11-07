import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { calculatePlanPrice } from "@/features/billing/pricing.mjs";
import { getMemberSubscriptionDetails } from "@/features/member/data";
import { formatDate, formatINR, getSubscriptionStatus } from "@/features/member/presentation";

export default async function MemberSubscriptionDetailsPage({ params }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    throw error;
  }

  const { subscriptionId } = await params;
  const details = await getMemberSubscriptionDetails(user._id, subscriptionId);
  if (!details) {
    notFound();
  }

  const { subscription, payments } = details;
  const { baseAmount: originalPrice, planDiscount } = calculatePlanPrice({
    baseMonthlyPrice: subscription.baseMonthlyPriceSnapshot,
    durationMonths: subscription.durationMonthsSnapshot,
    discountPercentage: subscription.discountPercentageSnapshot,
  });
  return (
    <div className="min-h-screen bg-[#f3f6f4] lg:flex">
      <MemberSidebar user={user} activePath="/subscriptions" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
          <Link href="/subscriptions" className="text-sm font-semibold text-emerald-800 hover:underline">Back to memberships</Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">MEMBERSHIP DETAILS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{subscription.planNameSnapshot}</h1>
            </div>
            <StatusBadge status={getSubscriptionStatus(subscription)} />
          </div>

          <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-slate-950">Subscription summary</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-xs text-slate-500">Membership period</dt><dd className="mt-1 text-sm font-medium">{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</dd></div>
              <div><dt className="text-xs text-slate-500">Duration</dt><dd className="mt-1 text-sm font-medium">{subscription.durationMonthsSnapshot} {subscription.durationMonthsSnapshot === 1 ? "month" : "months"}</dd></div>
              <div><dt className="text-xs text-slate-500">Plan price before discounts</dt><dd className="mt-1 text-sm font-medium">{formatINR(originalPrice)}</dd></div>
              <div><dt className="text-xs text-slate-500">Plan discount ({subscription.discountPercentageSnapshot}%)</dt><dd className="mt-1 text-sm font-medium">−{formatINR(planDiscount)}</dd></div>
              <div><dt className="text-xs text-slate-500">Coupon discount</dt><dd className="mt-1 text-sm font-medium">{subscription.couponCodeSnapshot ? `${subscription.couponCodeSnapshot} · −${formatINR(subscription.couponDiscountPaiseSnapshot)}` : formatINR(0)}</dd></div>
              <div><dt className="text-xs text-slate-500">Total payable</dt><dd className="mt-1 text-sm font-semibold">{formatINR(subscription.totalAmount)}</dd></div>
              <div><dt className="text-xs text-slate-500">Invoice number</dt><dd className="mt-1 text-sm font-medium">{subscription.invoiceNumber ?? "Not issued"}</dd></div>
              <div><dt className="text-xs text-slate-500">Paid / remaining</dt><dd className="mt-1 text-sm font-medium">{formatINR(subscription.amountPaid)} / {formatINR(subscription.remainingBalance)}</dd></div>
            </dl>
            {subscription.benefitsSnapshot?.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Plan benefits</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                  {subscription.benefitsSnapshot.map((benefit) => <li key={benefit}>{benefit}</li>)}
                </ul>
              </div>
            )}
            {subscription.remainingBalance > 0 && (
              <Link href="/billing" className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Pay remaining balance</Link>
            )}
            {(getSubscriptionStatus(subscription) === "EXPIRED" || getSubscriptionStatus(subscription) === "CANCELLED") && (
              <Link href="/plans" className="mt-6 inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Browse plans to renew</Link>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-950">Payments for this membership</h2>
            {payments.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No payments are recorded for this membership.</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr>{["Receipt", "Date", "Reference", "Method", "Status", "Amount", "Balance after"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <tr key={payment._id.toString()}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                          {payment.receiptNumber && payment.paymentStatus === "SUCCEEDED" ? (
                            <a href={`/receipts/${payment._id.toString()}`} className="font-semibold text-emerald-800 hover:underline">{payment.receiptNumber}</a>
                          ) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(payment.paymentDate ?? payment.createdAt)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.transactionReference ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{payment.paymentMethod.replaceAll("_", " ")}{payment.isDemoPayment && " · demo"}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-700">{payment.paymentStatus === "SUCCEEDED" ? (payment.remainingBalanceAfterPayment > 0 ? "PARTIAL" : "COMPLETED") : payment.paymentStatus}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">{formatINR(payment.amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-amber-800">{payment.remainingBalanceAfterPayment == null ? "—" : formatINR(payment.remainingBalanceAfterPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Demo payments are not gateway charges. Subscription history is read from your account only.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
