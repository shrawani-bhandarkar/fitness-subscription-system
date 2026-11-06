function isPositivePaise(value) {
  return Number.isInteger(value) && value > 0;
}

export function calculatePlanPrice(plan) {
  const baseAmount = plan.baseMonthlyPrice * plan.durationMonths;

  if (!Number.isSafeInteger(baseAmount) || !isPositivePaise(baseAmount)) {
    throw new Error("The selected plan has an invalid price.");
  }

  const planDiscount = Math.round(
    (baseAmount * (plan.discountPercentage ?? 0)) / 100,
  );
  const amountAfterPlanDiscount = baseAmount - planDiscount;
  if (!isPositivePaise(amountAfterPlanDiscount)) {
    throw new Error("The selected plan has an invalid payable price.");
  }
  return {
    baseAmount,
    planDiscount,
    amountAfterPlanDiscount,
  };
}

export function calculateCouponDiscount(coupon, amount) {
  if (!coupon) {
    return 0;
  }

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !isValidCouponDiscount(coupon)
  ) {
    throw new Error("The selected coupon has an invalid discount.");
  }

  const discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((amount * coupon.discountValue) / 100)
      : coupon.discountValue;
  return Math.min(amount, discount);
}

function isValidCouponDiscount(coupon) {
  if (coupon.discountType === "PERCENTAGE") {
    return (
      Number.isFinite(coupon.discountValue) &&
      coupon.discountValue > 0 &&
      coupon.discountValue <= 100
    );
  }

  return (
    coupon.discountType === "FLAT" &&
    Number.isSafeInteger(coupon.discountValue) &&
    coupon.discountValue > 0
  );
}

export function getCouponEligibility(coupon, { amount, now = new Date() }) {
  const minimumPurchaseAmount = coupon?.minimumPurchaseAmount ?? 0;
  const usageCount = coupon?.usageCount ?? 0;
  if (!coupon) {
    return { eligible: false, reason: "not_found" };
  }
  if (!coupon.isActive) {
    return { eligible: false, reason: "inactive" };
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { eligible: false, reason: "invalid_amount" };
  }
  if (!Number.isSafeInteger(minimumPurchaseAmount) || minimumPurchaseAmount < 0) {
    return { eligible: false, reason: "invalid_coupon" };
  }
  if (!isValidCouponDiscount(coupon)) {
    return { eligible: false, reason: "invalid_coupon" };
  }
  if (
    !(coupon.expiryDate instanceof Date) ||
    !Number.isFinite(coupon.expiryDate.getTime())
  ) {
    return { eligible: false, reason: "invalid_coupon" };
  }
  if (
    !Number.isInteger(usageCount) ||
    usageCount < 0 ||
    (coupon.usageLimit != null &&
      (!Number.isInteger(coupon.usageLimit) || coupon.usageLimit <= 0))
  ) {
    return { eligible: false, reason: "invalid_coupon" };
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { eligible: false, reason: "invalid_date" };
  }
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  if (coupon.expiryDate.getTime() < todayStart.getTime()) {
    return { eligible: false, reason: "expired" };
  }
  if (coupon.usageLimit != null && usageCount >= coupon.usageLimit) {
    return { eligible: false, reason: "usage_limit" };
  }
  if (amount < minimumPurchaseAmount) {
    return { eligible: false, reason: "minimum_purchase" };
  }
  return { eligible: true, reason: null };
}

export function isCouponEligible(coupon, options) {
  return getCouponEligibility(coupon, options).eligible;
}

export function getCheckoutCouponOffer(coupon, options) {
  const eligibility = getCouponEligibility(coupon, options);
  if (!eligibility.eligible && eligibility.reason !== "minimum_purchase") {
    return null;
  }

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumPurchaseAmount: coupon.minimumPurchaseAmount ?? 0,
    expiryDate: coupon.expiryDate.toISOString(),
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason,
  };
}

export function calculatePaymentAllocation({
  totalAmount,
  paymentType,
  amount,
  allowPartialPayment,
}) {
  if (!isPositivePaise(totalAmount)) {
    throw new Error("The selected plan must have a positive payable amount.");
  }
  const amountPaid = paymentType === "FULL" ? totalAmount : amount;
  if (
    !isPositivePaise(amountPaid) ||
    amountPaid > totalAmount ||
    (paymentType === "PARTIAL" &&
      (!allowPartialPayment || amountPaid >= totalAmount))
  ) {
    throw new Error("The payment amount is not allowed for this plan.");
  }
  const remainingBalance = totalAmount - amountPaid;
  return {
    amountPaid,
    remainingBalance,
    status: remainingBalance === 0 ? "ACTIVE" : "PARTIAL",
  };
}
