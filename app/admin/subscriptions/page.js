import { AdminNotice, AdminPageHeading, AdminPagination, AdminShell, AdminTableEmpty } from "@/components/admin/admin-shell";
import { BalanceWaiverForm } from "@/components/admin/admin-forms";
import { getAdminSubscriptions } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatDate, formatINR } from "@/features/member/presentation";

export default async function AdminSubscriptionsPage({ searchParams }) {
  const user = await requireAdminPageUser();
  const query = await searchParams;
  const search = typeof query?.q === "string" ? query.q.slice(0, 100) : "";
  const statuses = ["all", "PENDING", "PARTIAL", "ACTIVE", "EXPIRED", "CANCELLED"];
  const requestedStatus = typeof query?.status === "string" ? query.status : "all";
  const status = statuses.includes(requestedStatus) ? requestedStatus : "all";
  const requestedPage = typeof query?.page === "string" ? query.page : "1";
  const result = await getAdminSubscriptions(search, status, requestedPage);
  const { records: subscriptions, totalCount, currentPage, totalPages } = result;
  return (
    <AdminShell user={user} activePath="/admin/subscriptions">
      <AdminPageHeading title="Subscriptions" description="Member and plan snapshots, payment progress, and dates." />
      <AdminNotice query={query} />
      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <label htmlFor="subscription-search" className="sr-only">Search member, email, or plan</label>
        <input id="subscription-search" name="q" defaultValue={search} placeholder="Search member, email, or plan" className="min-h-11 min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        <label htmlFor="subscription-status" className="sr-only">Filter subscriptions by status</label>
        <select id="subscription-status" name="status" defaultValue={status} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          {statuses.map((item) => <option key={item} value={item}>{item === "all" ? "All statuses" : item}</option>)}
        </select>
        <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <section className="mt-5">
        <p className="mb-3 text-xs text-slate-500">{totalCount.toLocaleString("en-IN")} subscriptions</p>
        {subscriptions.length === 0 ? <AdminTableEmpty>No subscriptions match this search.</AdminTableEmpty> : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Member", "Plan", "Status", "Start / end", "Total", "Paid", "Balance", "Admin action"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((subscription) => (
                  <tr key={subscription._id.toString()} className="align-top">
                    <td className="px-4 py-4 text-sm"><p className="font-medium text-slate-900">{subscription.userId?.name ?? "Deleted member"}</p><p className="mt-1 text-xs text-slate-500">{subscription.userId?.email ?? subscription.memberReference ?? "—"}</p></td>
                    <td className="px-4 py-4 text-sm text-slate-700">{subscription.planNameSnapshot}</td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">{subscription.status}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{formatDate(subscription.startDate)}<br />{formatDate(subscription.endDate)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">{formatINR(subscription.totalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-emerald-800">{formatINR(subscription.amountPaid)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-amber-800">{formatINR(subscription.remainingBalance)}{subscription.balanceWaivedPaise > 0 && <p className="mt-1 text-[11px] text-slate-500">Waived: {formatINR(subscription.balanceWaivedPaise)}</p>}</td>
                    <td className="min-w-56 px-4 py-4">
                      {subscription.remainingBalance > 0 && subscription.amountPaid > 0 && subscription.status === "PARTIAL"
                        ? <BalanceWaiverForm subscriptionId={subscription._id.toString()} balance={formatINR(subscription.remainingBalance)} />
                        : <span className="text-xs text-slate-400">No action available</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination path="/admin/subscriptions" currentPage={currentPage} totalPages={totalPages} query={{ q: search, status }} />
      </section>
    </AdminShell>
  );
}
