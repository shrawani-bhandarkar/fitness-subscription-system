import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCouponDiscount,
  calculatePaymentAllocation,
  calculatePlanPrice,
  getCheckoutCouponOffer,
  getCouponEligibility,
  isCouponEligible,
} from "../features/billing/pricing.mjs";
import { parseRupeesToPaise } from "../lib/money.mjs";
import { getPaymentDisplayStatus } from "../features/billing/payment-status.mjs";
import { getSubscriptionStatus } from "../features/member/subscription-status.mjs";
import { isSubscriptionAccountingConsistent } from "../features/subscriptions/accounting.mjs";
import { getSubscriptionExpiryNotice } from "../features/member/expiry-notice.mjs";
import { parseMemberProfile } from "../features/member/profile-validation.mjs";

test("plan prices multiply monthly paise and apply percentage discount", () => {
  assert.deepEqual(
    calculatePlanPrice({
      baseMonthlyPrice: 10_000,
      durationMonths: 6,
      discountPercentage: 10,
    }),
    {
      baseAmount: 60_000,
      planDiscount: 6_000,
      amountAfterPlanDiscount: 54_000,
    },
  );
  assert.throws(() =>
    calculatePlanPrice({
      baseMonthlyPrice: 10_000,
      durationMonths: 1,
      discountPercentage: 100,
    }),
  );
});

test("full payment activates a subscription and partial payment preserves balance", () => {
  assert.deepEqual(
    calculatePaymentAllocation({
      totalAmount: 54_000,
      paymentType: "FULL",
      amount: 0,
      allowPartialPayment: true,
    }),
    { amountPaid: 54_000, remainingBalance: 0, status: "ACTIVE" },
  );
  assert.deepEqual(
    calculatePaymentAllocation({
      totalAmount: 54_000,
      paymentType: "PARTIAL",
      amount: 15_000,
      allowPartialPayment: true,
    }),
    { amountPaid: 15_000, remainingBalance: 39_000, status: "PARTIAL" },
  );
});

test("rejects invalid payment allocations", () => {
  for (const amount of [0, -1, 54_000, 54_001, 1.5]) {
    assert.throws(() =>
      calculatePaymentAllocation({
        totalAmount: 54_000,
        paymentType: "PARTIAL",
        amount,
        allowPartialPayment: true,
      }),
    );
  }
  assert.throws(() =>
    calculatePaymentAllocation({
      totalAmount: 54_000,
      paymentType: "PARTIAL",
      amount: 100,
      allowPartialPayment: false,
    }),
  );
});

test("coupon discounts are capped at payable total and eligibility is validated", () => {
  assert.equal(
    calculateCouponDiscount(
      { discountType: "PERCENTAGE", discountValue: 20 },
      10_000,
    ),
    2_000,
  );
  assert.equal(
    calculateCouponDiscount(
      { discountType: "FLAT", discountValue: 15_000 },
      10_000,
    ),
    10_000,
  );
  const coupon = {
    discountType: "PERCENTAGE",
    discountValue: 20,
    isActive: true,
    expiryDate: new Date("2026-11-05T00:00:00.000Z"),
    usageLimit: 2,
    usageCount: 1,
    minimumPurchaseAmount: 5_000,
  };
  assert.equal(
    isCouponEligible(coupon, {
      amount: 5_000,
      now: new Date("2026-11-05T19:00:00.000Z"),
    }),
    true,
  );
  assert.equal(isCouponEligible(coupon, { amount: 4_999 }), false);
  assert.equal(
    isCouponEligible({ ...coupon, usageCount: 2 }, { amount: 5_000 }),
    false,
  );
  assert.equal(isCouponEligible({ ...coupon, isActive: false }, { amount: 5_000 }), false);
  assert.equal(
    isCouponEligible({ ...coupon, discountType: "UNKNOWN" }, { amount: 5_000 }),
    false,
  );
  assert.equal(
    isCouponEligible({ ...coupon, discountValue: Number.NaN }, { amount: 5_000 }),
    false,
  );
  assert.equal(
    isCouponEligible({ ...coupon, minimumPurchaseAmount: 5_001 }, { amount: 5_000 }),
    false,
  );
  assert.throws(() =>
    calculateCouponDiscount(
      { discountType: "UNKNOWN", discountValue: 500 },
      5_000,
    ),
  );
});

test("rechecking a coupon does not consume its usage", () => {
  const coupon = {
    discountType: "PERCENTAGE",
    discountValue: 10,
    isActive: true,
    expiryDate: new Date("2026-11-07T00:00:00.000Z"),
    usageLimit: 2,
    usageCount: 0,
    minimumPurchaseAmount: 0,
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(isCouponEligible(coupon, { amount: 10_000 }), true);
  }
  assert.equal(coupon.usageCount, 0);
});

test("checkout offers use plan-discounted eligibility and expose only public fields", () => {
  const planPrice = calculatePlanPrice({
    baseMonthlyPrice: 10_000,
    durationMonths: 3,
    discountPercentage: 10,
  });
  const coupon = {
    _id: "internal-id",
    code: "MINIMUM10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minimumPurchaseAmount: 27_001,
    expiryDate: new Date("2026-11-07T00:00:00.000Z"),
    usageLimit: 5,
    usageCount: 1,
    isActive: true,
    createdBy: "admin-id",
  };

  assert.deepEqual(
    getCouponEligibility(coupon, {
      amount: planPrice.amountAfterPlanDiscount,
      now: new Date("2026-11-06T00:00:00.000Z"),
    }),
    { eligible: false, reason: "minimum_purchase" },
  );
  assert.deepEqual(
    getCheckoutCouponOffer(coupon, {
      amount: planPrice.amountAfterPlanDiscount,
      now: new Date("2026-11-06T00:00:00.000Z"),
    }),
    {
      code: "MINIMUM10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minimumPurchaseAmount: 27_001,
      expiryDate: "2026-11-07T00:00:00.000Z",
      eligible: false,
      ineligibleReason: "minimum_purchase",
    },
  );
  assert.equal(
    getCheckoutCouponOffer(
      { ...coupon, minimumPurchaseAmount: 27_000 },
      {
        amount: planPrice.amountAfterPlanDiscount,
        now: new Date("2026-11-06T00:00:00.000Z"),
      },
    ).eligible,
    true,
  );
  assert.equal(
    getCheckoutCouponOffer(
      { ...coupon, usageCount: 5 },
      { amount: planPrice.amountAfterPlanDiscount },
    ),
    null,
  );
  assert.equal(
    getCheckoutCouponOffer(
      { ...coupon, expiryDate: new Date("2026-11-05T00:00:00.000Z") },
      {
        amount: planPrice.amountAfterPlanDiscount,
        now: new Date("2026-11-06T00:00:00.000Z"),
      },
    ),
    null,
  );
});

test("verified offers are calculated correctly for Silver, Gold, and Platinum plans", () => {
  const coupons = [
    {
      code: "FESTIVE10",
      isActive: true,
      discountType: "PERCENTAGE",
      discountValue: 10,
      expiryDate: new Date("2026-12-31T00:00:00.000Z"),
      minimumPurchaseAmount: 100_000,
      usageLimit: 100,
      usageCount: 0,
    },
    {
      code: "GOLD500",
      isActive: true,
      discountType: "FLAT",
      discountValue: 50_000,
      expiryDate: new Date("2026-12-31T00:00:00.000Z"),
      minimumPurchaseAmount: 300_000,
      usageLimit: 50,
      usageCount: 0,
    },
    {
      code: "NEWMEMBER15",
      isActive: true,
      discountType: "PERCENTAGE",
      discountValue: 15,
      expiryDate: new Date("2026-12-31T00:00:00.000Z"),
      minimumPurchaseAmount: 500_000,
      usageLimit: 30,
      usageCount: 0,
    },
  ];
  const plans = [
    {
      name: "Silver",
      baseMonthlyPrice: 100_000,
      durationMonths: 3,
      discountPercentage: 0,
      eligible: ["FESTIVE10", "GOLD500"],
      minimumRestricted: ["NEWMEMBER15"],
    },
    {
      name: "Gold",
      baseMonthlyPrice: 90_000,
      durationMonths: 6,
      discountPercentage: 10,
      eligible: ["FESTIVE10", "GOLD500"],
      minimumRestricted: ["NEWMEMBER15"],
    },
    {
      name: "Platinum",
      baseMonthlyPrice: 80_000,
      durationMonths: 12,
      discountPercentage: 15,
      eligible: ["FESTIVE10", "GOLD500", "NEWMEMBER15"],
      minimumRestricted: [],
    },
  ];
  const now = new Date("2026-11-06T12:00:00.000Z");

  for (const plan of plans) {
    const price = calculatePlanPrice(plan);
    const results = coupons.map((coupon) => ({
      code: coupon.code,
      offer: getCheckoutCouponOffer(coupon, {
        amount: price.amountAfterPlanDiscount,
        now,
      }),
    }));
    assert.deepEqual(
      results.filter(({ offer }) => offer?.eligible).map(({ code }) => code),
      plan.eligible,
      `${plan.name} eligible coupon codes`,
    );
    assert.deepEqual(
      results
        .filter(({ offer }) => offer?.ineligibleReason === "minimum_purchase")
        .map(({ code }) => code),
      plan.minimumRestricted,
      `${plan.name} minimum purchase restrictions`,
    );
  }
});

test("rupee inputs convert to integer paise without accepting excess precision", () => {
  assert.equal(parseRupeesToPaise("125"), 12_500);
  assert.equal(parseRupeesToPaise("125.5"), 12_550);
  assert.equal(parseRupeesToPaise("0.01"), 1);
  assert.equal(parseRupeesToPaise("1.999"), null);
  assert.equal(parseRupeesToPaise("-10"), null);
});

test("historical payment labels remain unchanged after later payments settle", () => {
  assert.equal(
    getPaymentDisplayStatus({
      paymentStatus: "SUCCEEDED",
      remainingBalanceAfterPayment: 5_000,
      subscriptionId: { remainingBalance: 0 },
    }),
    "PARTIAL",
  );
  assert.equal(
    getPaymentDisplayStatus({
      paymentStatus: "SUCCEEDED",
      remainingBalanceAfterPayment: 0,
      subscriptionId: { remainingBalance: 5_000 },
    }),
    "SUCCEEDED",
  );
  assert.equal(getPaymentDisplayStatus({ paymentStatus: "REFUNDED" }), "REFUNDED");
});

test("subscription status expires pending and partial memberships at their end date", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  assert.equal(
    getSubscriptionStatus({
      status: "PARTIAL",
      endDate: "2026-11-04T00:00:00.000Z",
    }, now),
    "EXPIRED",
  );
  assert.equal(
    getSubscriptionStatus({
      status: "PENDING",
      endDate: "2026-11-06T00:00:00.000Z",
    }, now),
    "PENDING",
  );
  assert.equal(
    getSubscriptionStatus({
      status: "CANCELLED",
      endDate: "2026-11-04T00:00:00.000Z",
    }, now),
    "CANCELLED",
  );
});

test("subscription accounting enforces exact paid, remaining, and waived totals", () => {
  assert.equal(
    isSubscriptionAccountingConsistent({
      totalAmount: 10_000,
      amountPaid: 4_000,
      remainingBalance: 5_000,
      balanceWaivedPaise: 1_000,
    }),
    true,
  );
  assert.equal(
    isSubscriptionAccountingConsistent({
      totalAmount: 10_000,
      amountPaid: 12_000,
      remainingBalance: 0,
    }),
    false,
  );
  assert.equal(
    isSubscriptionAccountingConsistent({
      totalAmount: 10_000,
      amountPaid: 10_000,
      remainingBalance: 0,
      balanceWaivedPaise: 1,
    }),
    false,
  );
});

test("subscription expiry notices cover expired and expiring memberships", () => {
  const now = new Date("2026-11-05T00:00:00.000Z");
  assert.equal(
    getSubscriptionExpiryNotice(
      { status: "ACTIVE", endDate: "2026-11-08T00:00:00.000Z" },
      now,
    ).type,
    "expiring",
  );
  assert.equal(
    getSubscriptionExpiryNotice(
      { status: "PARTIAL", endDate: "2026-11-04T00:00:00.000Z" },
      now,
    ).type,
    "expired",
  );
  assert.equal(
    getSubscriptionExpiryNotice(
      { status: "CANCELLED", endDate: "2026-11-04T00:00:00.000Z" },
      now,
    ),
    null,
  );
});

test("member profile validation normalizes name, phone, and address inputs", () => {
  assert.deepEqual(
    parseMemberProfile({
      name: "  Jamie Member ",
      phone: "+1 (415) 555-0132",
      address: "  123 Main Street\nSpringfield  ",
    }),
    {
      name: "Jamie Member",
      phone: "+1 (415) 555-0132",
      address: "123 Main Street\nSpringfield",
    },
  );
  assert.deepEqual(parseMemberProfile({ name: "Jamie Member", phone: "" }), {
    name: "Jamie Member",
    phone: "",
    address: "",
  });
  assert.equal(parseMemberProfile({ name: "J", phone: "" }), null);
  assert.equal(parseMemberProfile({ name: "Jamie Member", phone: "call me" }), null);
  assert.equal(parseMemberProfile({ name: "Jamie Member", phone: "", address: "x".repeat(501) }), null);
});
