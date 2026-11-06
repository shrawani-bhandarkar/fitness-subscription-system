import Link from "next/link";
import {
  BadgePercent,
  CircleDollarSign,
  Clock3,
  Dumbbell,
  Layers3,
  Users,
} from "lucide-react";
import {
  AdminPageHeading,
  AdminShell,
  AdminStat,
} from "@/components/admin/admin-shell";
import { getAdminOverview, getRecentAdminAudits } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatDate, formatINR } from "@/features/member/presentation";

const navigation = [
  { href: "/admin/plans", label: "Manage plans", description: "Create, update, and publish memberships.", icon: Layers3 },
  { href: "/admin/coupons", label: "Manage coupons", description: "Configure discounts and usage limits.", icon: BadgePercent },
  { href: "/admin/subscriptions", label: "Subscriptions", description: "Search memberships and balances.", icon: Dumbbell },
  { href: "/admin/transactions", label: "Transactions", description: "Review payment records.", icon: CircleDollarSign },
  { href: "/admin/members", label: "Members", description: "View member account summaries.", icon: Users },
];

export default async function AdminDashboardPage() {
  const user = await requireAdminPageUser();
  const [overview, audits] = await Promise.all([
    getAdminOverview(),
    getRecentAdminAudits(),
  ]);

  return (
    <AdminShell user={user} activePath="/admin/dashboard">
      <AdminPageHeading
        title="Admin overview"
        description="A live summary of members, memberships, and recorded payments."
      />
      <section aria-label="Administration summary" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStat label="Members" value={overview.members.toLocaleString("en-IN")} icon={Users} />
        <AdminStat label="Active members" value={overview.activeMembers.toLocaleString("en-IN")} icon={Users} tone="green" />
        <AdminStat label="Members without active memberships" value={overview.inactiveMembers.toLocaleString("en-IN")} icon={Users} />
        <AdminStat label="Total subscriptions" value={overview.totalSubscriptions.toLocaleString("en-IN")} icon={Dumbbell} />
        <AdminStat label="Active subscriptions" value={overview.activeSubscriptions.toLocaleString("en-IN")} icon={Dumbbell} tone="green" />
        <AdminStat label="Expired subscriptions" value={overview.expiredSubscriptions.toLocaleString("en-IN")} icon={Clock3} />
        <AdminStat label="Collected" value={formatINR(overview.collected)} note="Successful records, including demo payments" icon={CircleDollarSign} tone="green" />
        <AdminStat label="Outstanding / pending" value={formatINR(overview.pendingPayments)} note="Pending payment records and partial subscription balances" icon={Clock3} tone="amber" />
        <AdminStat label="Plans" value={overview.planCount.toLocaleString("en-IN")} icon={Layers3} />
      </section>

      <section className="mt-9 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-950">Recent transactions</h2>
          {overview.recentTransactions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No transactions recorded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {overview.recentTransactions.map((payment) => (
                <li key={payment._id.toString()} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{payment.userId?.name ?? "Deleted member"}</p>
                    <p className="truncate text-xs text-slate-500">{payment.subscriptionId?.planNameSnapshot ?? "Membership"} · {payment.paymentStatus}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">{formatINR(payment.amount)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/transactions" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">View transactions</Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-semibold text-slate-950">Recent member registrations</h2>
          {overview.recentMembers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No member accounts registered.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {overview.recentMembers.map((member) => (
                <li key={member._id.toString()} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">{formatDate(member.registeredAt ?? member.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/members" className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline">View members</Link>
        </div>
      </section>

      <section className="mt-9">
        <h2 className="text-lg font-semibold text-slate-950">Management</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {navigation.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={20} aria-hidden="true" /></span>
              <h3 className="mt-4 font-semibold text-slate-950">{label}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">Recent administrative activity</h2>
            <p className="mt-1 text-sm text-slate-500">Audited plan, coupon, balance, and member-account changes.</p>
          </div>
        </div>
        {audits.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No audited administrative changes yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {audits.map((audit) => (
              <li key={audit._id.toString()} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{audit.action.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-600">{audit.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">By {audit.adminUserId?.name ?? "Administrator"}</p>
                </div>
                <time className="text-xs text-slate-500">{formatDate(audit.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
