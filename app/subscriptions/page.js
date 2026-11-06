import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { getMemberSubscriptions } from "@/features/member/data";
import { formatDate, formatINR, getSubscriptionStatus } from "@/features/member/presentation";

export default async function MemberSubscriptionsPage() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    throw error;
  }

  const subscriptions = await getMemberSubscriptions(user._id);
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <MemberSidebar user={user} activePath="/subscriptions" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <p className="text-sm font-semibold text-emerald-700">YOUR MEMBERSHIPS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Subscription history</h1>
          <p className="mt-2 text-sm text-slate-500">Memberships associated with your account, including current status and balances.</p>

          {subscriptions.length === 0 ? (
            <section className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="font-semibold text-slate-900">No memberships yet</h2>
              <p className="mt-2 text-sm text-slate-600">Choose a plan to start your membership.</p>
              <Link href="/plans" className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Browse plans</Link>
            </section>
          ) : (
            <div className="mt-7 space-y-4">
              {subscriptions.map((subscription) => (
                <article key={subscription._id.toString()} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{subscription.planNameSnapshot}</h2>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</p>
                    </div>
                    <StatusBadge status={getSubscriptionStatus(subscription)} />
                  </div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div><dt className="text-xs text-slate-500">Total</dt><dd className="mt-1 text-sm font-semibold">{formatINR(subscription.totalAmount)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Paid</dt><dd className="mt-1 text-sm font-semibold text-emerald-800">{formatINR(subscription.amountPaid)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Remaining</dt><dd className="mt-1 text-sm font-semibold text-amber-800">{formatINR(subscription.remainingBalance)}</dd></div>
                  </dl>
                  <Link href={`/subscriptions/${subscription._id.toString()}`} className="mt-5 inline-flex text-sm font-semibold text-emerald-800 hover:underline">View membership details</Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
