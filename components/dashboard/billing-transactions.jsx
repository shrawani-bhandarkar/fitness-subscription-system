import Link from "next/link";
import { ArrowUpRight, ReceiptText } from "lucide-react";
import { formatDate, formatINR } from "@/features/member/presentation";
import { getPaymentDisplayStatus } from "@/features/member/data";
import { StatusBadge } from "@/components/dashboard/status-badge";

const filters = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export function BillingTransactions({
  payments,
  activeFilter,
  searchValue,
  hasTransactions,
  currentPage,
  totalPages,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold text-slate-950">Invoices &amp; payment receipts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each confirmed payment has its own receipt linked to the subscription invoice.
          </p>
        </div>
      </div>
      <form action="/billing" method="get" className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:px-6">
        <input type="hidden" name="status" value={activeFilter} />
        <label className="flex-1 text-xs font-medium text-slate-700" htmlFor="payment-search">Search receipt, invoice, reference, plan, or method
          <input id="payment-search" name="q" defaultValue={searchValue} placeholder="Search billing records" className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </label>
        <button className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <nav aria-label="Filter payments" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-5 py-3 sm:px-6">
        {filters.map((filter) => {
          const params = new URLSearchParams();
          if (filter.value !== "all") params.set("status", filter.value);
          if (searchValue) params.set("q", searchValue);
          const href = params.size ? `/billing?${params.toString()}` : "/billing";
          return (
            <Link
              key={filter.value}
              href={href}
              aria-current={activeFilter === filter.value ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeFilter === filter.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {payments.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ReceiptText size={21} aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">
            No payments found
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {searchValue
              ? "No transactions match your search. Try another term or clear the search."
              : activeFilter === "all" && !hasTransactions
              ? "Your recorded transactions will appear here."
              : "There are no transactions matching this status filter."}
          </p>
          {(activeFilter !== "all" || searchValue) && (
            <Link
              href="/billing"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800"
            >
              Show all transactions <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/70">
                <tr>
                  {["Receipt #", "Date", "Plan / invoice", "Reference", "Status", "Payment", "Paid to date", "Balance", "View / PDF"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment._id.toString()}>
                    <td className="px-5 py-4 font-mono text-xs text-slate-700">{payment.receiptNumber ?? "No receipt"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(payment.paymentDate ?? payment.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {payment.subscriptionId?.planNameSnapshot ?? "Membership"}
                      {payment.subscriptionId?.invoiceNumber && (
                        <Link
                          href={`/subscriptions/${payment.subscriptionId._id.toString()}`}
                          className="mt-1 block text-xs text-emerald-800 hover:underline"
                        >
                          Invoice {payment.subscriptionId.invoiceNumber}
                        </Link>
                      )}
                      <span className="mt-1 block text-xs text-slate-500">{payment.paymentMethod.replaceAll("_", " ")}{payment.isDemoPayment && " · demo"}</span>
                    </td>
                    <td className="max-w-40 truncate px-5 py-4 font-mono text-xs text-slate-500">
                      {payment.transactionReference || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={getPaymentDisplayStatus(payment)} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatINR(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                      {payment.totalPaidAfterPaymentSnapshot == null
                        ? "—"
                        : formatINR(payment.totalPaidAfterPaymentSnapshot)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-amber-800">
                      {payment.remainingBalanceAfterPayment == null
                        ? "—"
                        : formatINR(payment.remainingBalanceAfterPayment)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm">
                      {payment.receiptNumber && payment.paymentStatus === "SUCCEEDED" ? (
                        <div className="flex flex-col items-end gap-1">
                          <Link href={`/receipts/${payment._id.toString()}`} className="font-semibold text-emerald-800 hover:underline">
                            View receipt
                          </Link>
                          <a href={`/api/receipts/${payment._id.toString()}`} className="text-xs text-slate-600 hover:underline">
                            Download PDF
                          </a>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {payments.map((payment) => (
              <li key={payment._id.toString()} className="space-y-3 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-slate-700">
                      {payment.receiptNumber ?? "No receipt"}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {payment.subscriptionId?.planNameSnapshot ?? "Membership"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(payment.paymentDate ?? payment.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-950">
                    {formatINR(payment.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {payment.paymentMethod.replaceAll("_", " ")}
                    {payment.isDemoPayment && " · demo"}
                    {payment.transactionReference
                      ? ` · ${payment.transactionReference}`
                      : ""}
                  </span>
                  <StatusBadge status={getPaymentDisplayStatus(payment)} />
                </div>
                <p className="text-xs text-slate-600">
                  Paid to date: {payment.totalPaidAfterPaymentSnapshot == null ? "—" : formatINR(payment.totalPaidAfterPaymentSnapshot)}
                  {" · "}Remaining: {payment.remainingBalanceAfterPayment == null ? "—" : formatINR(payment.remainingBalanceAfterPayment)}
                </p>
                {payment.receiptNumber && payment.paymentStatus === "SUCCEEDED" && (
                  <div className="flex flex-wrap gap-4">
                    <Link href={`/receipts/${payment._id.toString()}`} className="inline-flex text-sm font-semibold text-emerald-800 hover:underline">
                      View receipt {payment.receiptNumber}
                    </Link>
                    <a href={`/api/receipts/${payment._id.toString()}`} className="inline-flex text-sm font-semibold text-slate-700 hover:underline">
                      Download PDF
                    </a>
                  </div>
                )}
                {payment.subscriptionId?.invoiceNumber && (
                  <Link href={`/subscriptions/${payment.subscriptionId._id.toString()}`} className="text-xs text-emerald-800 hover:underline">
                    Invoice {payment.subscriptionId.invoiceNumber}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {totalPages > 1 && (
        <nav aria-label="Payment history pages" className="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-6">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={getPageHref(currentPage - 1, activeFilter, searchValue)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Previous</span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={getPageHref(currentPage + 1, activeFilter, searchValue)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400">Next</span>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}

function getPageHref(page, status, search) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  params.set("page", String(page));
  return `/billing?${params.toString()}`;
}
