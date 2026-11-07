import "server-only";

import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db.js";
import Coupon from "../../models/Coupon.js";
import Payment from "../../models/Payment.js";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { isPositivePaise } from "../../lib/currency.js";
import { ensureMembershipActivationNotification } from "../notifications/service.js";
import {
  calculateCouponDiscount,
  calculatePaymentAllocation,
  calculatePlanPrice,
  isCouponEligible,
} from "./pricing.mjs";

function addMonths(date, months) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

async function validateCoupon(code, amount, session) {
  if (!code) {
    return null;
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() })
    .session(session)
    .exec();
  if (!isCouponEligible(coupon, { amount })) {
    throw new Error("This coupon is not valid for the selected purchase.");
  }

  return coupon;
}

async function claimCoupon(coupon, session) {
  if (!coupon) {
    return;
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const updated = await Coupon.updateOne(
    {
      _id: coupon._id,
      isActive: true,
      expiryDate: { $gte: todayStart },
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ["$usageLimit", null] }, null] },
          {
            $lt: [
              { $ifNull: ["$usageCount", 0] },
              "$usageLimit",
            ],
          },
        ],
      },
    },
    { $inc: { usageCount: 1 } },
    { session },
  ).exec();

  if (updated.modifiedCount !== 1) {
    throw new Error("This coupon has reached its usage limit.");
  }
}

function makeReference() {
  return `DEMO-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

function makeDocumentNumber(prefix) {
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

async function ensureSubscriptionInvoiceRecord(subscriptionId, payment, session = null) {
  if (!subscriptionId) {
    return null;
  }

  const subscription = await Subscription.findById(subscriptionId)
    .select("invoiceNumber invoiceIssuedAt")
    .session(session)
    .exec();

  if (!subscription) {
    return null;
  }

  if (subscription.invoiceNumber && subscription.invoiceIssuedAt) {
    return subscription;
  }

  const invoiceNumber = subscription.invoiceNumber ?? makeDocumentNumber("INV");
  const invoiceIssuedAt = subscription.invoiceIssuedAt ?? payment.paymentDate ?? payment.createdAt ?? new Date();

  const updated = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      $or: [
        { invoiceNumber: { $exists: false } },
        { invoiceNumber: null },
        { invoiceIssuedAt: { $exists: false } },
        { invoiceIssuedAt: null },
      ],
    },
    {
      $set: {
        invoiceNumber,
        invoiceIssuedAt,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).exec();

  return updated ?? subscription;
}

export async function ensureSuccessfulPaymentReceipt(paymentId, session = null) {
  await connectToDatabase();
  await Payment.init();

  const payment = await Payment.findOne({
    _id: paymentId,
    paymentStatus: "SUCCEEDED",
  })
    .session(session)
    .exec();

  if (!payment) {
    return null;
  }

  if (payment.subscriptionId) {
    await ensureSubscriptionInvoiceRecord(payment.subscriptionId, payment, session);
  }

  const subscription = await Subscription.findById(payment.subscriptionId)
    .select(
      "userId totalAmount amountPaid remainingBalance invoiceNumber invoiceIssuedAt planNameSnapshot durationMonthsSnapshot planAmountBeforeDiscountSnapshot planDiscountPaiseSnapshot couponCodeSnapshot couponDiscountPaiseSnapshot baseMonthlyPriceSnapshot discountPercentageSnapshot benefitsSnapshot",
    )
    .session(session)
    .lean()
    .exec();

  if (subscription && (!subscription.invoiceNumber || !subscription.invoiceIssuedAt)) {
    const invoiceUpdated = await ensureSubscriptionInvoiceRecord(
      subscription._id,
      payment,
      session,
    );
    if (invoiceUpdated) {
      subscription.invoiceNumber = invoiceUpdated.invoiceNumber ?? subscription.invoiceNumber;
      subscription.invoiceIssuedAt = invoiceUpdated.invoiceIssuedAt ?? subscription.invoiceIssuedAt;
    }
  }
  const readySubscription = subscription;

  const member = payment.userId
    ? await User.findById(payment.userId)
        .select("name email")
        .session(session)
        .lean()
        .exec()
    : null;

  const memberSnapshot =
    payment.memberSnapshot &&
    (payment.memberSnapshot.memberId || payment.memberSnapshot.name || payment.memberSnapshot.email)
      ? payment.memberSnapshot
      : {
          memberId: payment.userId ? String(payment.userId) : payment.memberReference ?? null,
          name: member?.name ?? null,
          email: member?.email ?? null,
        };
  const receiptNumber = payment.receiptNumber ?? makeDocumentNumber("RCP");
  const hasPersistedReceipt = payment.receiptNumber != null;
  const couponCodeSnapshot = hasPersistedReceipt
    ? payment.couponCodeSnapshot ?? null
    : payment.couponCodeSnapshot || readySubscription?.couponCodeSnapshot || null;
  const couponDiscountPaiseSnapshot = hasPersistedReceipt
    ? payment.couponDiscountPaiseSnapshot ?? 0
    : payment.couponDiscountPaiseSnapshot > 0
      ? payment.couponDiscountPaiseSnapshot
      : readySubscription?.couponDiscountPaiseSnapshot ?? 0;
  const snapshot = {
    receiptNumber,
    receiptIssuedAt: payment.receiptIssuedAt ?? payment.paymentDate ?? payment.createdAt ?? new Date(),
    totalSubscriptionAmountSnapshot:
      payment.totalSubscriptionAmountSnapshot ?? readySubscription?.totalAmount ?? null,
    totalPaidAfterPaymentSnapshot:
      payment.totalPaidAfterPaymentSnapshot ?? readySubscription?.amountPaid ?? payment.amount ?? null,
    remainingBalanceAfterPayment:
      payment.remainingBalanceAfterPayment ?? readySubscription?.remainingBalance ?? 0,
    couponCodeSnapshot,
    couponDiscountPaiseSnapshot,
    memberSnapshot,
  };

  const shouldPatch =
    !payment.receiptNumber ||
    !payment.receiptIssuedAt ||
    payment.totalSubscriptionAmountSnapshot == null ||
    payment.totalPaidAfterPaymentSnapshot == null ||
    payment.remainingBalanceAfterPayment == null ||
    !payment.memberSnapshot ||
    !payment.memberSnapshot.memberId ||
    payment.couponCodeSnapshot == null ||
    payment.couponDiscountPaiseSnapshot == null;

  if (!shouldPatch) {
    return payment;
  }

  const updated = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      paymentStatus: "SUCCEEDED",
    },
    { $set: snapshot },
    {
      new: true,
      runValidators: true,
      session,
    },
  ).exec();

  return updated ?? payment;
}

async function getMemberSnapshot(userId, session) {
  const member = await User.findById(userId)
    .select("name email")
    .session(session)
    .lean()
    .exec();
  if (!member) {
    throw new Error("The member account could not be verified for payment.");
  }
  return {
    memberId: String(member._id),
    name: member.name,
    email: member.email,
  };
}

function getIdempotencyFingerprint(request) {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

async function findMatchingReplay({ idempotencyKey, idempotencyFingerprint, userId }) {
  const payment = await Payment.findOne({ idempotencyKey })
    .select("userId subscriptionId idempotencyFingerprint")
    .lean()
    .exec();
  if (!payment) {
    return null;
  }
  if (
    String(payment.userId) !== String(userId) ||
    payment.idempotencyFingerprint !== idempotencyFingerprint
  ) {
    throw new Error("This payment request key has already been used for a different request.");
  }
  return payment.subscriptionId;
}

export async function createDemoEnrollment({
  userId,
  planId,
  paymentType,
  amount,
  paymentMethod,
  couponCode,
  idempotencyKey,
  quoteTotalPaise,
}) {
  await connectToDatabase();
  await Promise.all([Payment.init(), Coupon.init()]);
  const normalizedCouponCode = couponCode?.toUpperCase() ?? "";
  const idempotencyFingerprint = getIdempotencyFingerprint({
    operation: "ENROLLMENT",
    userId: String(userId),
    planId: String(planId),
    paymentType,
    amount,
    paymentMethod,
    couponCode: normalizedCouponCode,
    quoteTotalPaise,
  });
  const session = await mongoose.startSession();
  let subscriptionId;
  let activationPayload = null;

  try {
    await session.withTransaction(async () => {
      const replay = await Payment.findOne({ idempotencyKey })
        .session(session)
        .exec();
      if (replay) {
        if (
          String(replay.userId) !== String(userId) ||
          replay.idempotencyFingerprint !== idempotencyFingerprint
        ) {
          throw new Error("This payment request key has already been used for a different request.");
        }
        subscriptionId = replay.subscriptionId;
        return;
      }

      const plan = await Plan.findOne({ _id: planId, isActive: true })
        .session(session)
        .exec();
      if (!plan) {
        throw new Error("The selected plan is unavailable.");
      }

      const price = calculatePlanPrice(plan);
      const coupon = await validateCoupon(
        couponCode,
        price.amountAfterPlanDiscount,
        session,
      );
      const couponDiscount = calculateCouponDiscount(
        coupon,
        price.amountAfterPlanDiscount,
      );
      const totalAmount = price.amountAfterPlanDiscount - couponDiscount;
      if (quoteTotalPaise !== totalAmount) {
        throw new Error("The checkout price changed. Review the updated total before confirming.");
      }
      const allocation = calculatePaymentAllocation({
        totalAmount,
        paymentType,
        amount,
        allowPartialPayment: plan.allowPartialPayment,
      });
      const { amountPaid: paymentAmount, remainingBalance, status } = allocation;
      const memberSnapshot = await getMemberSnapshot(userId, session);

      const startDate = new Date();
      const endDate = addMonths(startDate, plan.durationMonths);
      const [subscription] = await Subscription.create(
        [
          {
            userId,
            planId: plan._id,
            status,
            startDate,
            endDate,
            nextPaymentDueDate:
              remainingBalance > 0 ? addMonths(startDate, 1) : null,
            totalAmount,
            amountPaid: paymentAmount,
            remainingBalance,
            planNameSnapshot: plan.name,
            invoiceNumber: makeDocumentNumber("INV"),
            invoiceIssuedAt: new Date(),
            planAmountBeforeDiscountSnapshot: price.baseAmount,
            planDiscountPaiseSnapshot: price.planDiscount,
            baseMonthlyPriceSnapshot: plan.baseMonthlyPrice,
            discountPercentageSnapshot: plan.discountPercentage,
            durationMonthsSnapshot: plan.durationMonths,
            benefitsSnapshot: plan.benefits,
            couponCodeSnapshot: coupon?.code ?? null,
            couponDiscountPaiseSnapshot: couponDiscount,
          },
        ],
        { session },
      );

      const [createdPayment] = await Payment.create(
        [
          {
            userId,
            subscriptionId: subscription._id,
            memberSnapshot,
            amount: paymentAmount,
            paymentStatus: "SUCCEEDED",
            isDemoPayment: true,
            paymentMethod,
            transactionReference: makeReference(),
            receiptNumber: makeDocumentNumber("RCP"),
            receiptIssuedAt: new Date(),
            totalSubscriptionAmountSnapshot: totalAmount,
            totalPaidAfterPaymentSnapshot: paymentAmount,
            idempotencyKey,
            idempotencyFingerprint,
            remainingBalanceAfterPayment: remainingBalance,
            paymentDate: new Date(),
            couponCodeSnapshot: coupon?.code ?? null,
            couponDiscountPaiseSnapshot: couponDiscount,
          },
        ],
        { session },
      );
      await ensureSuccessfulPaymentReceipt(createdPayment._id, session);
      await claimCoupon(coupon, session);
      subscriptionId = subscription._id;
      if (status === "ACTIVE") {
        activationPayload = {
          userId,
          subscriptionId: subscription._id,
          planName: subscription.planNameSnapshot,
          previousStatus: null,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        };
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      subscriptionId = await findMatchingReplay({
        idempotencyKey,
        idempotencyFingerprint,
        userId,
      });
      if (subscriptionId) {
        return subscriptionId;
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (activationPayload) {
    await ensureMembershipActivationNotification(activationPayload);
  }

  return subscriptionId;
}

export async function createDemoBalancePayment({
  userId,
  subscriptionId,
  amount,
  paymentMethod,
  idempotencyKey,
}) {
  await connectToDatabase();
  await Payment.init();
  const idempotencyFingerprint = getIdempotencyFingerprint({
    operation: "BALANCE_PAYMENT",
    userId: String(userId),
    subscriptionId: String(subscriptionId),
    amount,
    paymentMethod,
  });
  const session = await mongoose.startSession();
  let updatedSubscriptionId;
  let activationPayload = null;

  try {
    await session.withTransaction(async () => {
      const replay = await Payment.findOne({ idempotencyKey })
        .session(session)
        .exec();
      if (replay) {
        if (
          String(replay.userId) !== String(userId) ||
          replay.idempotencyFingerprint !== idempotencyFingerprint
        ) {
          throw new Error("This payment request key has already been used for a different request.");
        }
        updatedSubscriptionId = replay.subscriptionId;
        return;
      }

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId,
        status: { $in: ["PARTIAL", "PENDING", "ACTIVE", "EXPIRED"] },
      })
        .session(session)
        .exec();

      if (!subscription || subscription.remainingBalance <= 0) {
        throw new Error("No outstanding balance is available for payment.");
      }

      if (!isPositivePaise(amount) || amount > subscription.remainingBalance) {
        throw new Error("The payment must be within the outstanding balance.");
      }

      const previousStatus = subscription.status;
      const remainingBalance = subscription.remainingBalance - amount;
      const memberSnapshot = await getMemberSnapshot(userId, session);
      subscription.amountPaid += amount;
      subscription.remainingBalance = remainingBalance;
      const isExpired = subscription.endDate <= new Date();
      subscription.status = isExpired
        ? "EXPIRED"
        : remainingBalance === 0
          ? "ACTIVE"
          : "PARTIAL";
      subscription.nextPaymentDueDate =
        remainingBalance === 0 || isExpired
          ? null
          : subscription.nextPaymentDueDate ?? addMonths(new Date(), 1);
      await subscription.save({ session });
      if (subscription.status === "ACTIVE" && previousStatus !== "ACTIVE") {
        activationPayload = {
          userId,
          subscriptionId: subscription._id,
          planName: subscription.planNameSnapshot,
          previousStatus,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        };
      }

      const [createdPayment] = await Payment.create(
        [
          {
            userId,
            subscriptionId: subscription._id,
            memberSnapshot,
            amount,
            paymentStatus: "SUCCEEDED",
            isDemoPayment: true,
            paymentMethod,
            transactionReference: makeReference(),
            receiptNumber: makeDocumentNumber("RCP"),
            receiptIssuedAt: new Date(),
            totalSubscriptionAmountSnapshot: subscription.totalAmount,
            totalPaidAfterPaymentSnapshot: subscription.amountPaid,
            idempotencyKey,
            idempotencyFingerprint,
            remainingBalanceAfterPayment: remainingBalance,
            paymentDate: new Date(),
          },
        ],
        { session },
      );
      await ensureSuccessfulPaymentReceipt(createdPayment._id, session);
      updatedSubscriptionId = subscription._id;
    });
  } catch (error) {
    if (error?.code === 11000) {
      updatedSubscriptionId = await findMatchingReplay({
        idempotencyKey,
        idempotencyFingerprint,
        userId,
      });
      if (updatedSubscriptionId) {
        return updatedSubscriptionId;
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (activationPayload) {
    await ensureMembershipActivationNotification(activationPayload);
  }

  return updatedSubscriptionId;
}
