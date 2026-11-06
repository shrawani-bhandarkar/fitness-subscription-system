import { processDemoBalancePayment } from "@/features/billing/actions";
import { DemoSubmitButton } from "@/components/billing/demo-submit-button";

export function BalancePaymentForm({ subscription, idempotencyKey }) {
  const payableRupees = (subscription.remainingBalance / 100).toFixed(2);
  return (
    <form action={processDemoBalancePayment} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="subscriptionId" value={subscription._id.toString()} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label className="text-xs font-medium text-slate-700">Amount (INR)
        <input name="amount" type="number" min="0.01" max={payableRupees} step="0.01" defaultValue={payableRupees} required className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-slate-700">Demo payment method
        <select name="paymentMethod" defaultValue="UPI" className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="UPI">UPI (demo)</option>
          <option value="CARD">Card (demo)</option>
          <option value="NET_BANKING">Net banking (demo)</option>
        </select>
      </label>
      <DemoSubmitButton className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Pay balance (demo)</DemoSubmitButton>
    </form>
  );
}
