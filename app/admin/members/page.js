import { AdminNotice, AdminPageHeading, AdminPagination, AdminShell, AdminTableEmpty } from "@/components/admin/admin-shell";
import { getAdminMembers } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatDate, formatINR } from "@/features/member/presentation";
import Link from "next/link";

export default async function AdminMembersPage({ searchParams }) {
  const user = await requireAdminPageUser();
  const query = await searchParams;
  const search = typeof query?.q === "string" ? query.q.slice(0, 100) : "";
  const memberships = ["all", "ACTIVE", "PARTIAL", "EXPIRED", "NONE"];
  const requestedMembership = typeof query?.membership === "string" ? query.membership : "all";
  const membership = memberships.includes(requestedMembership) ? requestedMembership : "all";
  const requestedPage = typeof query?.page === "string" ? query.page : "1";
  const result = await getAdminMembers(search, requestedPage, membership);
  const { records: members, totalCount, currentPage, totalPages } = result;
  return (
    <AdminShell user={user} activePath="/admin/members">
      <AdminPageHeading title="Members" description="Registered member accounts and aggregate billing summaries. Authentication secrets are not accessible here." />
      <AdminNotice query={query} />
      <form role="search" className="mt-6 flex flex-wrap gap-2">
        <label htmlFor="member-search" className="sr-only">Search members by name or email</label>
        <input id="member-search" name="q" defaultValue={search} placeholder="Search name or email" className="min-h-11 min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        <label htmlFor="member-membership" className="sr-only">Filter members by membership</label>
        <select id="member-membership" name="membership" defaultValue={membership} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          {memberships.map((status) => <option key={status} value={status}>{status === "all" ? "All members" : status === "NONE" ? "No membership" : status}</option>)}
        </select>
        <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <p className="mt-4 text-xs text-slate-500">{totalCount.toLocaleString("en-IN")} members · showing up to 50 per page</p>
      <section className="mt-3">
        {members.length === 0 ? <AdminTableEmpty>No members match this search.</AdminTableEmpty> : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>{["Member", "Joined", "Subscriptions", "Total paid", "Outstanding"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member._id.toString()}>
                    <td className="px-4 py-4 text-sm"><Link href={`/admin/members/${member._id.toString()}`} className="font-medium text-emerald-800 hover:underline">{member.name}</Link><p className="text-xs text-slate-500">{member.email}</p></td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(member.registeredAt ?? member.createdAt)}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{member.subscriptionSummary.count}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-emerald-800">{formatINR(member.paymentSummary.paid)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-amber-800">{formatINR(member.subscriptionSummary.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination path="/admin/members" currentPage={currentPage} totalPages={totalPages} query={{ q: search, membership }} />
      </section>
    </AdminShell>
  );
}
