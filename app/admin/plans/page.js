import { AdminNotice, AdminPageHeading, AdminPagination, AdminShell, AdminTableEmpty } from "@/components/admin/admin-shell";
import { PlanEditor } from "@/components/admin/admin-forms";
import { getAdminPlans } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatINR } from "@/features/member/presentation";

export default async function AdminPlansPage({ searchParams }) {
  const user = await requireAdminPageUser();
  const query = await searchParams;
  const requestedPage = typeof query?.page === "string" ? query.page : "1";
  const result = await getAdminPlans(requestedPage);
  const { records: plans, totalCount, currentPage, totalPages } = result;
  return (
    <AdminShell user={user} activePath="/admin/plans">
      <AdminPageHeading title="Manage plans" description="Publish membership pricing and benefits. Price snapshots on existing subscriptions are never altered." />
      <AdminNotice query={query} />
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="font-semibold text-slate-950">Create a plan</h2>
        <p className="mt-1 text-xs text-slate-500">All displayed prices are INR. Monthly prices are stored in paise.</p>
        <div className="mt-5"><PlanEditor /></div>
      </section>
      <section className="mt-9">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Existing plans ({totalCount})</h2>
        {plans.length === 0 ? <AdminTableEmpty>No plans created yet.</AdminTableEmpty> : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <article key={plan._id.toString()} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatINR(plan.baseMonthlyPrice)} / month · {plan.durationMonths} months · {plan.discountPercentage}% discount</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{plan.isActive ? "Active" : "Inactive"}</span>
                </div>
                <PlanEditor plan={plan} />
              </article>
            ))}
          </div>
        )}
        <AdminPagination path="/admin/plans" currentPage={currentPage} totalPages={totalPages} />
      </section>
    </AdminShell>
  );
}
