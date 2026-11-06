import { AdminNotice, AdminPageHeading, AdminPagination, AdminShell, AdminTableEmpty } from "@/components/admin/admin-shell";
import { CouponEditor } from "@/components/admin/admin-forms";
import { getAdminCoupons } from "@/features/admin/data";
import { requireAdminPageUser } from "@/features/admin/access";
import { formatDate, formatINR } from "@/features/member/presentation";

function discountLabel(coupon) {
  return coupon.discountType === "FLAT"
    ? formatINR(coupon.discountValue)
    : `${coupon.discountValue}%`;
}

export default async function AdminCouponsPage({ searchParams }) {
  const user = await requireAdminPageUser();
  const query = await searchParams;
  const requestedPage = typeof query?.page === "string" ? query.page : "1";
  const result = await getAdminCoupons(requestedPage);
  const { records: coupons, totalCount, currentPage, totalPages } = result;
  return (
    <AdminShell user={user} activePath="/admin/coupons">
      <AdminPageHeading title="Manage coupons" description="Set eligibility, validity windows, and usage caps. Coupon rules are enforced server-side during checkout." />
      <AdminNotice query={query} />
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="font-semibold text-slate-950">Create a coupon</h2>
        <p className="mt-1 text-xs text-slate-500">Flat discount and minimum purchase amounts use INR; values are stored in paise.</p>
        <div className="mt-5"><CouponEditor /></div>
      </section>
      <section className="mt-9">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Existing coupons ({totalCount})</h2>
        {coupons.length === 0 ? <AdminTableEmpty>No coupons created yet.</AdminTableEmpty> : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <article key={coupon._id.toString()} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{coupon.code} · {discountLabel(coupon)}</h3>
                    <p className="mt-1 text-sm text-slate-500">Expires {formatDate(coupon.expiryDate)} · Used {coupon.usageCount}{coupon.usageLimit == null ? "" : ` / ${coupon.usageLimit}`} · Minimum {formatINR(coupon.minimumPurchaseAmount)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{coupon.isActive ? "Active" : "Inactive"}</span>
                </div>
                <CouponEditor coupon={coupon} />
              </article>
            ))}
          </div>
        )}
        <AdminPagination path="/admin/coupons" currentPage={currentPage} totalPages={totalPages} />
      </section>
    </AdminShell>
  );
}
