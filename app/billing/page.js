import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  CircleDollarSign,
  Clock3,
  Wallet,
} from "lucide-react";
import { BillingTransactions } from "@/components/dashboard/billing-transactions";
import { BalancePaymentForm } from "@/components/billing/balance-payment-form";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { getBillingData } from "@/features/member/data";
import { formatINR } from "@/features/member/presentation";

const filters = new Set(["all", "paid", "pending", "partial", "failed", "refunded"]);

export default async function BillingPage({ searchParams }) {
  let user;

  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }

    throw error;
  }

  const params = await searchParams;
  const requestedFilter = Array.isArray(params?.status)
    ? params.status[0]
    : params?.status;
  const activeFilter = filters.has(requestedFilter) ? requestedFilter : "all";
  const searchValue = typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = Number.parseInt(
    Array.isArray(params?.page) ? params.page[0] : params?.page,
    10,
  );
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, 1_000_000))
    : 1;
  const {
    totalPaid,
    pendingTotal,
    outstanding,
    payments,
    payableSubscriptions,
    totalPaymentCount,
    totalPages,
  } = await getBillingData(user._id, {
    status: activeFilter,
    search: searchValue,
    page: currentPage,
    pageSize: 50,
  });
  if (currentPage > totalPages) {
    const query = new URLSearchParams();
    if (activeFilter !== "all") query.set("status", activeFilter);
    if (searchValue) query.set("q", searchValue);
    query.set("page", String(totalPages));
    redirect(`/billing?${query.toString()}`);
  }
  const notice = params?.payment === "demo-success"
    ? "Demo payment recorded. No real payment provider was used."
    : params?.payment === "already-processed"
      ? "This checkout request was already processed."
      : params?.error
        ? "The demo payment could not be completed. Review the amount and try again."
        : null;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <MemberSidebar user={user} activePath="/billing" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              ACCOUNT FINANCES
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Billing &amp; transactions
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              A record of payments linked to your membership.
            </p>
          </div>

          <section
            aria-label="Billing summary"
            className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <StatCard
              label="Total paid"
              value={formatINR(totalPaid)}
              description="Recorded successful payments"
              icon={CircleDollarSign}
              tone="green"
            />
            <StatCard
              label="Pending payments"
              value={formatINR(pendingTotal)}
              description="Transactions awaiting confirmation"
              icon={Clock3}
              tone={pendingTotal > 0 ? "amber" : "slate"}
            />
            <StatCard
              label="Outstanding balance"
              value={formatINR(outstanding)}
              description="Unpaid balance on your memberships"
              icon={Wallet}
              tone={outstanding > 0 ? "amber" : "green"}
            />
          </section>

          {notice && (
            <p role={params?.error ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-sm ${params?.error ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
              {notice}
            </p>
          )}

          {payableSubscriptions.length > 0 && (
            <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold text-slate-950">Outstanding membership balances</h2>
              <p className="mt-1 text-sm text-slate-500">Use the clearly labeled demo action to record another payment.</p>
              <div className="mt-4 divide-y divide-slate-100">
                {payableSubscriptions.map((subscription) => (
                  <article key={subscription._id.toString()} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{subscription.planNameSnapshot}</p>
                      <p className="text-sm font-semibold text-amber-800">{formatINR(subscription.remainingBalance)} due</p>
                    </div>
                    <BalancePaymentForm
                      subscription={subscription}
                      idempotencyKey={randomUUID()}
                    />
                  </article>
                ))}
              </div>
              <p className="mt-4 text-xs text-amber-800">Demo only: no money is charged. Payment records will be marked as demo transactions.</p>
            </section>
          )}

          <div className="mt-7">
            <BillingTransactions
              payments={payments}
              activeFilter={activeFilter}
              searchValue={searchValue}
              hasTransactions={totalPaymentCount > 0}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Transaction records are read from your account only. Any payment
            action shown here records a clearly labeled demo transaction; no
            real payment gateway is connected.
          </p>
        </div>
      </main>
    </div>
  );
}
