import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Wallet,
} from "lucide-react";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import { PlanCard } from "@/components/dashboard/plan-card";
import { RecentPayments } from "@/components/dashboard/recent-payments";
import { StatCard } from "@/components/dashboard/stat-card";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { getMemberDashboardData } from "@/features/member/data";
import {
  formatDate,
  formatINR,
  getSubscriptionStatus,
} from "@/features/member/presentation";

export default async function DashboardPage() {
  let user;

  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }

  const {
    subscription,
    subscriptionCount,
    totalPaid,
    outstanding,
    recentPayments,
    availablePlans,
  } =
    await getMemberDashboardData(user._id);
  const subscriptionStatus = getSubscriptionStatus(subscription);
  const firstName = user.name.split(/\s+/)[0] || user.name;

  return (
    <div className="min-h-screen bg-[#f3f6f4] lg:flex">
      <MemberSidebar user={user} activePath="/dashboard" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                MEMBER OVERVIEW
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome back, {firstName}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Here&apos;s the latest on your fitness membership.
              </p>
            </div>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <section
            aria-label="Membership summary"
            className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
          >
            <StatCard
              label="Total subscriptions"
              value={subscriptionCount.toLocaleString("en-IN")}
              description="Memberships on your account"
              icon={CalendarClock}
            />
            <StatCard
              label="Membership status"
              value={
                subscriptionStatus
                  ? subscriptionStatus.charAt(0) +
                    subscriptionStatus.slice(1).toLowerCase()
                  : "No plan"
              }
              description={
                subscription
                  ? `Latest plan: ${subscription.planNameSnapshot}`
                  : "Choose a plan to get started."
              }
              icon={CalendarClock}
              tone={subscriptionStatus === "ACTIVE" ? "green" : "slate"}
            />
            <StatCard
              label="Total paid"
              value={formatINR(totalPaid)}
              description="Recorded successful payments"
              icon={CircleDollarSign}
              tone="green"
            />
            <StatCard
              label="Outstanding balance"
              value={formatINR(outstanding)}
              description="Across your non-cancelled memberships"
              icon={Wallet}
              tone={outstanding > 0 ? "amber" : "slate"}
            />
            <StatCard
              label="Next payment due"
              value={
                subscription?.nextPaymentDueDate
                  ? formatDate(subscription.nextPaymentDueDate)
                  : "Not scheduled"
              }
              description={
                subscription?.nextPaymentDueDate
                  ? "Next payment date on record"
                  : "No payment due date is stored yet."
              }
              icon={CalendarClock}
            />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
            <SubscriptionCard subscription={subscription} />
            <RecentPayments payments={recentPayments} />
          </div>

          <section className="mt-9">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                  Find your fit
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Available plans
                </h2>
              </div>
              <Link
                href="/plans"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Browse all plans <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {availablePlans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No plans are available right now
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Published plans will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {availablePlans.map((plan) => (
                  <PlanCard key={plan._id.toString()} plan={plan} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
