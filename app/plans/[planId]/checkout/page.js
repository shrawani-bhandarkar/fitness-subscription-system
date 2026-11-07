import { randomUUID } from "node:crypto";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DemoCheckoutForm } from "@/components/billing/demo-checkout-form";
import {
  AuthenticationRequiredError,
  MemberAuthorizationError,
  requireMemberUser,
} from "@/features/auth/server";
import {
  calculateCouponDiscount,
  calculatePlanPrice,
  getCheckoutCouponOffer,
  getCouponEligibility,
  isCouponEligible,
} from "@/features/billing/pricing.mjs";
import { formatDate, formatINR } from "@/features/member/presentation";
import { connectToDatabase } from "@/lib/db";
import Coupon from "@/models/Coupon";
import Plan from "@/models/Plan";

export default async function CheckoutPage({ params, searchParams }) {
  let user;
  try {
    user = await requireMemberUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    if (error instanceof MemberAuthorizationError) {
      redirect(`${error.redirectPath}?error=MEMBER_REQUIRED`);
    }
    throw error;
  }

  const { planId } = await params;
  if (!/^[a-f\d]{24}$/i.test(planId)) {
    notFound();
  }

  await connectToDatabase();
  const [plan, query] = await Promise.all([
    Plan.findOne({ _id: planId, isActive: true }).lean().exec(),
    searchParams,
  ]);
  if (!plan) {
    notFound();
  }

  let price;
  try {
    price = calculatePlanPrice(plan);
  } catch {
    notFound();
  }
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const couponRecords = await Coupon.find({})
    .select(
      "-_id code isActive discountType discountValue minimumPurchaseAmount expiryDate usageLimit usageCount",
    )
    .sort({ expiryDate: 1, code: 1 })
    .lean()
    .exec();
  const evaluatedOffers = couponRecords.map((coupon) => {
    const options = {
      amount: price.amountAfterPlanDiscount,
      now: todayStart,
    };
    return {
      coupon,
      eligibility: getCouponEligibility(coupon, options),
      offer: getCheckoutCouponOffer(coupon, options),
    };
  });
  const availableOffers = evaluatedOffers
    .map(({ offer }) => offer)
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    console.info("[checkout:coupon-offers]", {
      plan: plan.name,
      fetched: couponRecords.length,
      listed: availableOffers.length,
      excluded: evaluatedOffers
        .filter(({ eligibility }) => !eligibility.eligible)
        .map(({ coupon, eligibility, offer }) => ({
          code: coupon.code,
          reason: eligibility.reason,
          displayedAsOffer: Boolean(offer),
        })),
    });
  }
  const errorCode = typeof query?.error === "string" ? query.error : null;
  const errorMessage = {
    INVALID_INPUT: "Please review your payment details and try again.",
    INVALID_AMOUNT: "Enter a valid payment amount smaller than the plan total.",
    PLAN_UNAVAILABLE: "This plan is no longer available.",
    COUPON_INVALID: "That coupon is invalid, expired, at its usage limit, or does not meet the minimum purchase.",
    COUPON_LIMIT: "That coupon has reached its usage limit.",
    INVALID_PLAN_PRICE: "This plan has an invalid payable price. Contact an administrator.",
    QUOTE_CHANGED: "The plan or coupon price changed while checkout was open. Review the current total and confirm again.",
    PAYMENT_RETRY: "This payment request may already have completed. Check your billing history before retrying.",
    IDEMPOTENCY_CONFLICT: "This payment request was already used. Refresh checkout and try again.",
  }[errorCode];
  const couponInput =
    typeof query?.coupon === "string" ? query.coupon.trim().toUpperCase() : "";
  const couponCode = /^[A-Z0-9_-]{3,32}$/.test(couponInput)
    ? couponInput
    : "";
  const coupon = couponCode
    ? await Coupon.findOne({ code: couponCode }).lean().exec()
    : null;
  const couponFormatValid = !couponInput || Boolean(couponCode);
  const couponEligible =
    couponFormatValid &&
    (!couponCode ||
      isCouponEligible(coupon, { amount: price.amountAfterPlanDiscount }));
  const couponDiscount = couponEligible
    ? calculateCouponDiscount(coupon, price.amountAfterPlanDiscount)
    : 0;
  const totalAmount = price.amountAfterPlanDiscount - couponDiscount;
  const validQuote = couponEligible && totalAmount > 0;
  const appliedCoupon = validQuote ? coupon?.code ?? "" : "";
  const couponError =
    (couponInput || couponCode) && !validQuote
      ? "This coupon is invalid, expired, at its usage limit, below the minimum purchase, or does not leave a payable balance."
      : null;
  const checkoutError =
    errorMessage ??
    (errorCode === "COUPON_INVALID" || errorCode === "COUPON_LIMIT"
      ? "The coupon is no longer valid. Reapply it to refresh the checkout total."
      : null);

  return (
    <main className="min-h-screen bg-[#f3f6f4] px-4 py-6 sm:px-8 sm:py-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft size={16} aria-hidden="true" /> Back to plans
        </Link>
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">Membership checkout</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{plan.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
            <p className="mt-6 text-sm text-slate-500">{plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"} · INR</p>
            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Monthly price</dt>
                <dd className="font-medium text-slate-900">{formatINR(plan.baseMonthlyPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Plan total before discount</dt>
                <dd className="font-medium text-slate-900">{formatINR(price.baseAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Plan discount ({plan.discountPercentage}%)</dt>
                <dd className="font-medium text-emerald-800">−{formatINR(price.planDiscount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">After plan discount</dt>
                <dd className="font-medium text-slate-900">{formatINR(price.amountAfterPlanDiscount)}</dd>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Coupon ({appliedCoupon})</dt>
                  <dd className="font-medium text-emerald-800">−{formatINR(couponDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-3 text-base">
                <dt className="font-semibold text-slate-950">Final payable</dt>
                <dd className="font-semibold text-slate-950">{formatINR(totalAmount)}</dd>
              </div>
            </dl>
            {plan.benefits?.length > 0 && (
              <ul className="mt-6 space-y-2 border-t border-slate-100 pt-5">
                {plan.benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm text-slate-600"><Check size={16} className="text-emerald-700" />{benefit}</li>)}
              </ul>
            )}
            <p className="mt-6 text-xs text-slate-500">Enrolling as {user.name} ({user.email})</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-slate-950">Choose your payment</h2>
            <p className="mt-1 text-sm text-slate-500">Discounts and balances are recalculated securely when submitted.</p>
            {checkoutError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {checkoutError}
              </p>
            )}
            <form method="get" action={`/plans/${plan._id.toString()}/checkout`} className="mt-5 flex flex-wrap items-end gap-3">
              <label htmlFor="coupon" className="min-w-48 flex-1 text-sm font-medium text-slate-700">
                Coupon code (optional)
                <input id="coupon" name="coupon" defaultValue={couponCode} maxLength={32} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase" />
              </label>
              <button type="submit" className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Apply Coupon</button>
            </form>
            {couponCode && validQuote && (
              <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Coupon {appliedCoupon} applied. Your coupon discount is {formatINR(couponDiscount)}.
              </p>
            )}
            {couponError && <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{couponError}</p>}
            {couponCode && (
              <form method="get" action={`/plans/${plan._id.toString()}/checkout`} className="mt-2">
                <button type="submit" className="min-h-10 px-2 text-sm font-medium text-slate-600 underline">Remove Coupon</button>
              </form>
            )}
            <section aria-labelledby="available-offers-heading" className="mt-7 border-t border-slate-100 pt-5">
              <h3 id="available-offers-heading" className="text-sm font-semibold text-slate-900">Available offers</h3>
              <p className="mt-1 text-xs text-slate-500">Offers are checked against this plan’s price after its plan discount.</p>
              {availableOffers.length === 0 ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">There are no available coupon offers for this plan right now.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {availableOffers.map((offer) => (
                    <li key={offer.code} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{offer.code}</p>
                          <p className="mt-1 text-sm text-slate-700">
                            {offer.discountType === "PERCENTAGE"
                              ? `${offer.discountValue}% off`
                              : `${formatINR(offer.discountValue)} off`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Minimum purchase: {formatINR(offer.minimumPurchaseAmount)} · Expires {formatDate(offer.expiryDate)}
                          </p>
                        </div>
                        {offer.eligible ? (
                          <form method="get" action={`/plans/${plan._id.toString()}/checkout`}>
                            <input type="hidden" name="coupon" value={offer.code} />
                            <button
                              type="submit"
                              disabled={appliedCoupon === offer.code}
                              className="min-h-10 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-default disabled:border-emerald-200 disabled:text-emerald-700"
                            >
                              {appliedCoupon === offer.code ? "Applied" : "Apply"}
                            </button>
                          </form>
                        ) : (
                          <p className="text-sm font-medium text-amber-800">
                            Minimum purchase not met
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="mt-6">
              {validQuote ? <DemoCheckoutForm
                planId={plan._id.toString()}
                totalRupees={(totalAmount / 100).toFixed(2)}
                canPayPartially={plan.allowPartialPayment}
                idempotencyKey={randomUUID()}
                couponCode={appliedCoupon}
                quoteTotalPaise={totalAmount}
              />
              : <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Apply a valid coupon or remove the current code to continue.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
