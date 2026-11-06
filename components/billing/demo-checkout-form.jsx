"use client";

import { useState } from "react";
import { processDemoCheckout } from "@/features/billing/actions";
import { DemoSubmitButton } from "@/components/billing/demo-submit-button";

export function DemoCheckoutForm({
  planId,
  totalRupees,
  canPayPartially,
  idempotencyKey,
  couponCode,
  quoteTotalPaise,
}) {
  const [paymentType, setPaymentType] = useState("FULL");

  return (
    <form action={processDemoCheckout} className="space-y-5">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="couponCode" value={couponCode} />
      <input type="hidden" name="quoteTotalPaise" value={quoteTotalPaise} />
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Payment amount</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
            <input
              type="radio"
              name="paymentType"
              value="FULL"
              checked={paymentType === "FULL"}
              onChange={() => setPaymentType("FULL")}
              className="mt-1 accent-emerald-700"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Full payment</span>
              <span className="mt-1 block text-xs text-slate-500">Pay the complete plan price now.</span>
            </span>
          </label>
          {canPayPartially && (
            <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50">
              <input
                type="radio"
                name="paymentType"
                value="PARTIAL"
                checked={paymentType === "PARTIAL"}
                onChange={() => setPaymentType("PARTIAL")}
                className="mt-1 accent-emerald-700"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Partial payment</span>
                <span className="mt-1 block text-xs text-slate-500">Pay any amount below the total.</span>
              </span>
            </label>
          )}
        </div>
      </fieldset>

      {paymentType === "PARTIAL" && (
        <div>
          <label htmlFor="partialAmount" className="text-sm font-medium text-slate-700">
            Amount to pay (INR)
          </label>
          <input
            id="partialAmount"
            name="partialAmount"
            type="number"
            min="0.01"
            max={totalRupees}
            step="0.01"
            required
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
        </div>
      )}

      <div>
        <label htmlFor="paymentMethod" className="text-sm font-medium text-slate-700">Demo payment method</label>
        <select id="paymentMethod" name="paymentMethod" defaultValue="UPI" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="UPI">UPI (demo)</option>
          <option value="CARD">Card (demo)</option>
          <option value="NET_BANKING">Net banking (demo)</option>
        </select>
      </div>

      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Demo payment only. No real payment provider is connected and no money will be charged.
      </p>
      <DemoSubmitButton className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">
        Confirm demo payment
      </DemoSubmitButton>
    </form>
  );
}
