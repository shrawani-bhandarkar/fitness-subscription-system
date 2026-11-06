"use client";

import {
  deleteCoupon,
  deletePlan,
  saveCoupon,
  saveMemberProfile,
  savePlan,
  waiveSubscriptionBalance,
} from "@/features/admin/actions";

function ConfirmForm({ action, children, message }) {
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(message)) event.preventDefault();
    }}>
      {children}
    </form>
  );
}

function Field({ label, name, defaultValue = "", type = "text", required = false, ...props }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} {...props} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
    </label>
  );
}

export function MemberEditor({ member }) {
  return (
    <form action={saveMemberProfile} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="memberId" value={member._id.toString()} />
      <Field label="Member name" name="name" defaultValue={member.name} required minLength="2" maxLength="80" />
      <Field label="Phone number" name="phone" type="tel" defaultValue={member.phone ?? ""} maxLength="32" />
      <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Address<textarea name="address" rows="3" maxLength="500" defaultValue={member.address ?? ""} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
      <Field label="Reason for audit log" name="changeReason" minLength="4" maxLength="500" required />
      <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:col-span-2">
        Save member details
      </button>
    </form>
  );
}

export function PlanEditor({ plan }) {
  return (
    <>
      <form action={savePlan} className="grid gap-3 sm:grid-cols-2">
        {plan && <input type="hidden" name="planId" value={plan._id.toString()} />}
        <Field label="Plan name" name="name" defaultValue={plan?.name} required />
        <Field label="Duration (months)" name="durationMonths" type="number" min="1" max="60" defaultValue={plan?.durationMonths ?? 1} required />
        <Field label="Monthly price (INR)" name="baseMonthlyPriceRupees" type="number" min="0.01" step="0.01" defaultValue={plan ? (plan.baseMonthlyPrice / 100).toFixed(2) : ""} required />
        <Field label="Discount (%)" name="discountPercentage" type="number" min="0" max="99.99" step="0.01" defaultValue={plan?.discountPercentage ?? 0} />
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Description<textarea name="description" rows="2" maxLength="1000" defaultValue={plan?.description ?? ""} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Benefits (one per line)<textarea name="benefits" rows="3" maxLength="2000" defaultValue={plan?.benefits?.join("\n") ?? ""} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="isPopular" defaultChecked={plan?.isPopular ?? false} /> Recommended</label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="allowPartialPayment" defaultChecked={plan?.allowPartialPayment ?? false} /> Allow partial payment</label>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} /> Active and available</label>
        <Field label="Reason for audit log" name="changeReason" minLength="4" maxLength="500" required />
        <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:col-span-2">{plan ? "Save changes" : "Create plan"}</button>
      </form>
      {plan && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ConfirmForm action={deletePlan} message={`Delete ${plan.name}? If subscriptions use this plan, it will be deactivated instead so their history remains intact.`}>
            <input type="hidden" name="planId" value={plan._id.toString()} />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Deletion reason" name="reason" minLength="4" maxLength="500" required />
              <button className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Delete plan</button>
            </div>
          </ConfirmForm>
        </div>
      )}
    </>
  );
}

export function CouponEditor({ coupon }) {
  const flat = coupon?.discountType === "FLAT";
  return (
    <>
      <form action={saveCoupon} className="grid gap-3 sm:grid-cols-2">
        {coupon && <input type="hidden" name="couponId" value={coupon._id.toString()} />}
        <Field label="Coupon code" name="code" defaultValue={coupon?.code} required maxLength="32" />
        <label className="block text-xs font-medium text-slate-700">Discount type
          <select name="discountType" defaultValue={coupon?.discountType ?? "PERCENTAGE"} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="PERCENTAGE">Percentage</option><option value="FLAT">Flat INR</option>
          </select>
        </label>
        <Field label="Percentage value (used for percentage coupons)" name="percentageDiscount" type="number" min="0.01" max="99.99" step="0.01" defaultValue={!flat ? coupon?.discountValue ?? "" : ""} />
        <Field label="Flat discount (INR, used for flat coupons)" name="flatDiscountRupees" type="number" min="0.01" step="0.01" defaultValue={flat ? (coupon.discountValue / 100).toFixed(2) : ""} />
        <Field label="Expiry date" name="expiryDate" type="date" defaultValue={coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 10) : ""} required />
        <Field label="Usage limit (empty = unlimited)" name="usageLimit" type="number" min="1" defaultValue={coupon?.usageLimit ?? ""} />
        <Field label="Minimum purchase (INR)" name="minimumPurchaseRupees" type="number" min="0" step="0.01" defaultValue={((coupon?.minimumPurchaseAmount ?? 0) / 100).toFixed(2)} />
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" name="isActive" defaultChecked={coupon?.isActive ?? true} /> Active</label>
        <Field label="Reason for audit log" name="changeReason" minLength="4" maxLength="500" required />
        <button className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 sm:col-span-2">{coupon ? "Save coupon" : "Create coupon"}</button>
      </form>
      {coupon && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ConfirmForm action={deleteCoupon} message={`Delete coupon ${coupon.code}? Used coupons cannot be deleted.`}>
            <input type="hidden" name="couponId" value={coupon._id.toString()} />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Deletion reason" name="reason" minLength="4" maxLength="500" required />
              <button className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50">Delete coupon</button>
            </div>
          </ConfirmForm>
        </div>
      )}
    </>
  );
}

export function BalanceWaiverForm({ subscriptionId, balance }) {
  return (
    <ConfirmForm action={waiveSubscriptionBalance} message="Waive this outstanding balance? This does not record money received; the reason will be audited.">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <label className="block min-w-48 text-xs font-medium text-slate-700">
        Waive {balance}
        <input name="reason" required minLength="4" maxLength="500" placeholder="Reason required" className="mt-1.5 min-h-9 w-full rounded-lg border border-slate-300 px-2 text-xs" />
      </label>
      <button className="mt-2 min-h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-50">Audited balance waiver</button>
    </ConfirmForm>
  );
}
