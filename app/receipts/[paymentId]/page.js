import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { isAdministratorRole } from "@/features/auth/authorization.mjs";
import { getPaymentReceiptDetails } from "@/features/billing/receipts";
import { getReceiptPaymentStatus } from "@/features/billing/payment-status.mjs";
import { formatDate, formatINR } from "@/features/member/presentation";

function ReceiptContent({ receipt, businessName, businessContact, backHref }) {
  const { payment, subscription, member } = receipt;
  const fields = [
    ["Receipt number", payment.receiptNumber],
    ["Invoice number", subscription.invoiceNumber],
    ["Payment ID", payment._id.toString()],
    ["Transaction reference", payment.transactionReference ?? "Not available"],
    ["Member name", member.name],
    ["Member email", member.email],
    ["Member ID", member.memberId],
    ["Plan", subscription.planNameSnapshot],
    ["Duration", `${subscription.durationMonthsSnapshot} months`],
    ["Payment date and time", new Date(payment.paymentDate ?? payment.createdAt).toISOString()],
    ["Payment method", payment.paymentMethod.replaceAll("_", " ")],
    ["Payment status", getReceiptPaymentStatus(payment)],
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
      <Link href={backHref} className="text-sm font-semibold text-emerald-800 hover:underline">
        Back to billing records
      </Link>
      <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-emerald-950 px-6 py-7 text-white sm:px-8">
          <p className="text-sm font-semibold tracking-wide">{businessName}</p>
          {businessContact && <p className="mt-1 text-xs text-emerald-100">{businessContact}</p>}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-200">RECEIPT</p>
              <h1 className="mt-2 text-2xl font-semibold">{payment.receiptNumber}</h1>
              <p className="mt-1 text-sm text-emerald-100">Invoice {subscription.invoiceNumber}</p>
            </div>
            <p className="text-3xl font-semibold">{formatINR(payment.amount)}</p>
          </div>
        </header>

        <div className="p-6 sm:p-8">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || "Not available"}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="text-base font-semibold text-slate-950">Invoice and payment breakdown</h2>
            <dl className="mt-4 divide-y divide-slate-100">
              {[
                ["Original plan price", subscription.planAmountBeforeDiscountSnapshot],
                ["Plan discount", -(subscription.planDiscountPaiseSnapshot ?? 0)],
                [`Coupon discount${subscription.couponCodeSnapshot ? ` (${subscription.couponCodeSnapshot})` : ""}`, -(subscription.couponDiscountPaiseSnapshot ?? 0)],
                ["Final subscription amount", subscription.totalAmount],
                ["Amount received in this payment", payment.amount],
                ["Total paid after this payment", payment.totalPaidAfterPaymentSnapshot],
                ["Remaining balance after this payment", payment.remainingBalanceAfterPayment],
              ].map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className={`shrink-0 font-semibold ${label === "Amount received in this payment" ? "text-lg text-emerald-800" : "text-slate-900"}`}>
                    {amount == null ? "Not available" : `${amount < 0 ? "−" : ""}${formatINR(Math.abs(amount))}`}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {payment.isDemoPayment && (
            <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Demo payment: no money was charged through a payment gateway.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/api/receipts/${payment._id.toString()}`}
              className="inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Download PDF receipt
            </a>
          </div>
        </div>
      </article>
      <p className="mt-4 text-xs text-slate-500">
        Receipt details are generated from the recorded payment and subscription snapshots. No tax or business-registration details are inferred.
      </p>
    </div>
  );
}

export default async function PaymentReceiptPage({ params }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    throw error;
  }

  const { paymentId } = await params;
  const receipt = await getPaymentReceiptDetails(paymentId, user);
  if (!receipt || receipt.status !== "ok") {
    notFound();
  }

  const isAdmin = isAdministratorRole(user.role);
  const content = (
    <ReceiptContent
      receipt={receipt}
      businessName={process.env.RECEIPT_BUSINESS_NAME || "Fitness Club"}
      businessContact={process.env.RECEIPT_BUSINESS_CONTACT || ""}
      backHref={isAdmin ? "/admin/transactions" : "/billing"}
    />
  );
  return isAdmin ? (
    <AdminShell user={user} activePath="/admin/transactions">{content}</AdminShell>
  ) : (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <MemberSidebar user={user} activePath="/billing" />
      <main className="min-w-0 flex-1">{content}</main>
    </div>
  );
}
