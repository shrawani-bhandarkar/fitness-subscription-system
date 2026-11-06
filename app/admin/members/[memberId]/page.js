import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberEditor } from "@/components/admin/admin-forms";
import { MemberDeletion } from "@/components/admin/member-deletion";
import {
  AdminNotice,
  AdminPageHeading,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPageUser } from "@/features/admin/access";
import { getAdminMemberDetails } from "@/features/admin/data";
import { toMemberEditorDto } from "@/features/admin/member-editor-dto.mjs";
import { formatDate, formatINR } from "@/features/member/presentation";

export default async function AdminMemberDetailsPage({ params, searchParams }) {
  const admin = await requireAdminPageUser();
  const [{ memberId }, query] = await Promise.all([params, searchParams]);
  const details = await getAdminMemberDetails(memberId);
  if (!details) {
    notFound();
  }

  const { member, subscriptions, payments } = details;
  const memberEditorDto = toMemberEditorDto(member);
  return (
    <AdminShell user={admin} activePath="/admin/members">
      <Link href="/admin/members" className="text-sm font-semibold text-emerald-800 hover:underline">
        Back to members
      </Link>
      <div className="mt-5">
        <AdminPageHeading
          title={member.name}
          description="Member profile, membership history, and payment records."
        />
      </div>
      <AdminNotice query={query} />

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-950">Member profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Email and account role are managed by authentication and server
            configuration.
          </p>
        </div>
        <dl className="mb-6 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium text-slate-900">{member.email}</dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd className="mt-1 font-medium text-slate-900">{member.phone || "Not provided"}</dd></div>
          <div className="sm:col-span-3"><dt className="text-slate-500">Address</dt><dd className="mt-1 whitespace-pre-line font-medium text-slate-900">{member.address || "Not provided"}</dd></div>
          <div><dt className="text-slate-500">Joined</dt><dd className="mt-1 font-medium text-slate-900">{formatDate(member.registeredAt ?? member.createdAt)}</dd></div>
        </dl>
        <MemberEditor member={memberEditorDto} />
        <MemberDeletion
          member={{
            _id: member._id.toString(),
            name: member.name,
            email: member.email,
          }}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-950">Subscription history</h2>
        {subscriptions.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            This member has no subscriptions.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Plan", "Status", "Start / end", "Total", "Paid", "Balance"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((subscription) => (
                  <tr key={subscription._id.toString()}>
                    <td className="px-4 py-3 text-sm text-slate-900">{subscription.planNameSnapshot}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{subscription.status}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{formatINR(subscription.totalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-emerald-800">{formatINR(subscription.amountPaid)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-amber-800">{formatINR(subscription.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-950">Payment history</h2>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            This member has no payment records.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Date", "Reference", "Plan", "Method", "Status", "Amount"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment._id.toString()}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatDate(payment.paymentDate ?? payment.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.transactionReference ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{payment.subscriptionId?.planNameSnapshot ?? "Membership"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{payment.paymentMethod.replaceAll("_", " ")}{payment.isDemoPayment && " · demo"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{payment.paymentStatus}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{formatINR(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payments.length === 100 && (
          <p className="mt-2 text-xs text-slate-500">Showing the latest 100 payments.</p>
        )}
      </section>
    </AdminShell>
  );
}
