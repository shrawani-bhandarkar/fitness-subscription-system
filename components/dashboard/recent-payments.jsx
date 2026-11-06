import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import { formatDate, formatINR } from "@/features/member/presentation";
import { getPaymentDisplayStatus } from "@/features/member/data";
import { StatusBadge } from "@/components/dashboard/status-badge";

export function RecentPayments({ payments }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-slate-950">Recent payments</h2>
          <p className="mt-1 text-xs text-slate-500">
            Your latest recorded transactions
          </p>
        </div>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
        >
          All billing <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {payments.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ReceiptText size={20} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-800">
            No transactions yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Recorded payments will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <li
              key={payment._id.toString()}
              className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {payment.subscriptionId?.planNameSnapshot ?? "Membership payment"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(payment.paymentDate ?? payment.createdAt)}
                  {payment.isDemoPayment ? " · Demo transaction" : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-sm font-semibold text-slate-950">
                  {formatINR(payment.amount)}
                </span>
                <StatusBadge status={getPaymentDisplayStatus(payment)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
