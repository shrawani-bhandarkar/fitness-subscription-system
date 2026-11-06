import { AdminPageHeading, AdminPagination, AdminShell, AdminTableEmpty } from "@/components/admin/admin-shell";
import { getAdminTransactions } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatDate, formatINR } from "@/features/member/presentation";

const statuses = ["all", "COMPLETED", "PARTIAL", "PENDING", "FAILED", "REFUNDED"];

function firstString(value) {
  return typeof value === "string" ? value : "";
}

function validDate(value) {
  const input = firstString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return "";
  }
  const parsed = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input
    ? ""
    : input;
}

export default async function AdminTransactionsPage({ searchParams }) {
  const user = await requireAdminPageUser();
  const query = await searchParams;
  const search = firstString(query?.q).slice(0, 100);
  const status = statuses.includes(firstString(query?.status)) ? firstString(query?.status) : "all";
  const from = validDate(query?.from);
  const to = validDate(query?.to);
  const requestedPage = firstString(query?.page) || "1";
  const result = await getAdminTransactions({ search, status, from, to, page: requestedPage });
  const { records: transactions, totalCount, currentPage, totalPages } = result;
  return (
    <AdminShell user={user} activePath="/admin/transactions">
      <AdminPageHeading title="Transactions & receipts" description="Search members, receipt numbers, invoice numbers, or references; filter status and date." />
      <form role="search" className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-700 lg:col-span-2">Member, receipt, invoice, or reference
          <input name="q" defaultValue={search} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Search billing records" />
        </label>
        <label className="text-xs font-medium text-slate-700">Status
          <select name="status" defaultValue={status} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
            {statuses.map((item) => <option key={item} value={item}>{item === "all" ? "All statuses" : item}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">From
          <input type="date" name="from" defaultValue={from} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </label>
        <label className="text-xs font-medium text-slate-700">To
          <input type="date" name="to" defaultValue={to} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </label>
        <button className="min-h-10 self-end rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Apply filters</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">{totalCount.toLocaleString("en-IN")} matching transaction{totalCount === 1 ? "" : "s"} · showing up to 50 per page</p>
      <section className="mt-3">
        {transactions.length === 0 ? <AdminTableEmpty>No transactions match the selected filters.</AdminTableEmpty> : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Member", "Reference", "Receipt / Invoice", "Plan", "Date", "Method", "Status", "Amount"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((payment) => (
                  <tr key={payment._id.toString()}>
                    <td className="px-4 py-4 text-sm"><p className="font-medium text-slate-900">{payment.memberSnapshot?.name ?? payment.userId?.name ?? "Deleted member"}</p><p className="text-xs text-slate-500">{payment.memberSnapshot?.email ?? payment.userId?.email ?? payment.memberReference ?? "—"}</p></td>
                    <td className="max-w-48 truncate px-4 py-4 font-mono text-xs text-slate-600">{payment.transactionReference ?? "—"}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      <p>{payment.receiptNumber ?? "No receipt"}</p>
                      <p>{payment.subscriptionId?.invoiceNumber ?? "No invoice"}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">Payment {payment._id.toString()}</p>
                      {payment.receiptNumber && payment.paymentStatus === "SUCCEEDED" && (
                        <div className="mt-1 flex flex-col items-start gap-1">
                          <a href={`/receipts/${payment._id.toString()}`} className="font-semibold text-emerald-800 hover:underline">
                            View receipt
                          </a>
                          <a href={`/api/receipts/${payment._id.toString()}`} className="text-slate-600 hover:underline">
                            Download PDF
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{payment.subscriptionId?.planNameSnapshot ?? "Membership"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(payment.paymentDate ?? payment.createdAt)}</td>
                    <td className="px-4 py-4 text-xs text-slate-600">{payment.paymentMethod.replaceAll("_", " ")}{payment.isDemoPayment && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">DEMO</span>}</td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">{payment.paymentStatus === "SUCCEEDED" ? (payment.remainingBalanceAfterPayment > 0 ? "PARTIAL" : "COMPLETED") : payment.paymentStatus}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      <p>{formatINR(payment.amount)}</p>
                      <p className="mt-1 text-[11px] font-normal text-slate-500">Paid {payment.totalPaidAfterPaymentSnapshot == null ? "—" : formatINR(payment.totalPaidAfterPaymentSnapshot)} · Due {payment.remainingBalanceAfterPayment == null ? "—" : formatINR(payment.remainingBalanceAfterPayment)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination path="/admin/transactions" currentPage={currentPage} totalPages={totalPages} query={{ q: search, status, from, to }} />
      </section>
    </AdminShell>
  );
}
