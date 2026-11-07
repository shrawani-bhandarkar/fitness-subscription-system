import "server-only";

import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db.js";
import Payment from "../../models/Payment.js";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import {
  getPaymentDisplayStatus as getPaymentDisplayStatusValue,
} from "../billing/payment-status.mjs";
import { ensureSuccessfulPaymentReceipt } from "../billing/service.js";

async function getAccountTotals(userId) {
  const [paymentTotals, subscriptionTotals] = await Promise.all([
    Payment.aggregate([
      { $match: { userId, paymentStatus: "SUCCEEDED" } },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "linkedSubscription",
        },
      },
      {
        $match: {
          $or: [
            { linkedSubscription: { $size: 0 } },
            { "linkedSubscription.userId": userId },
          ],
        },
      },
      { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
    ]),
    Subscription.aggregate([
      { $match: { userId, status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, outstanding: { $sum: "$remainingBalance" } } },
    ]),
  ]);

  return {
    totalPaid: paymentTotals[0]?.totalPaid ?? 0,
    outstanding: subscriptionTotals[0]?.outstanding ?? 0,
  };
}

function getSubscriptionOwnershipStages(userId) {
  return [
    {
      $lookup: {
        from: "subscriptions",
        let: { linkedId: "$subscriptionId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$linkedId"] } } },
          {
            $project: {
              userId: 1,
              planNameSnapshot: 1,
              invoiceNumber: 1,
              invoiceIssuedAt: 1,
              planAmountBeforeDiscountSnapshot: 1,
              planDiscountPaiseSnapshot: 1,
              baseMonthlyPriceSnapshot: 1,
              discountPercentageSnapshot: 1,
              durationMonthsSnapshot: 1,
              couponCodeSnapshot: 1,
              couponDiscountPaiseSnapshot: 1,
              totalAmount: 1,
              amountPaid: 1,
              remainingBalance: 1,
            },
          },
        ],
        as: "linkedSubscription",
      },
    },
    {
      $match: {
        $or: [
          { linkedSubscription: { $size: 0 } },
          { "linkedSubscription.userId": userId },
        ],
      },
    },
    {
      $set: {
        subscriptionId: {
          $ifNull: [{ $arrayElemAt: ["$linkedSubscription", 0] }, null],
        },
      },
    },
    { $unset: "linkedSubscription" },
  ];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getPaymentFilter(userId, { status = "all", search = "" } = {}) {
  const clauses = [];
  if (status === "pending") {
    clauses.push({ paymentStatus: "PENDING" });
  } else if (status === "partial") {
    clauses.push({
      paymentStatus: "SUCCEEDED",
      remainingBalanceAfterPayment: { $gt: 0 },
    });
  } else if (status === "paid") {
    clauses.push({
      paymentStatus: "SUCCEEDED",
      $or: [
        { remainingBalanceAfterPayment: { $exists: false } },
        { remainingBalanceAfterPayment: null },
        { remainingBalanceAfterPayment: 0 },
      ],
    });
  } else if (status === "failed" || status === "refunded") {
    clauses.push({
      paymentStatus: status === "failed" ? "FAILED" : "REFUNDED",
    });
  }

  const value = search.trim().slice(0, 100);
  if (value) {
    const regex = new RegExp(escapeRegex(value), "i");
    const matchingSubscriptions = await Subscription.find({
      userId,
      $or: [{ planNameSnapshot: regex }, { invoiceNumber: regex }],
    })
      .select("_id")
      .lean()
      .exec();
    clauses.push({
      $or: [
        { transactionReference: regex },
        { receiptNumber: regex },
        { paymentMethod: regex },
        { subscriptionId: { $in: matchingSubscriptions.map(({ _id }) => _id) } },
      ],
    });
  }

  return {
    userId,
    ...(clauses.length ? { $and: clauses } : {}),
  };
}

async function getUserPayments(
  userId,
  { limit, skip = 0, status = "all", search = "" } = {},
) {
  const filter = await getPaymentFilter(userId, { status, search });
  const pipeline = [
    { $match: filter },
    ...getSubscriptionOwnershipStages(userId),
    { $sort: { paymentDate: -1, createdAt: -1 } },
  ];

  if (skip > 0) {
    pipeline.push({ $skip: skip });
  }
  if (limit) {
    pipeline.push({ $limit: limit });
  }

  const payments = await Payment.aggregate(pipeline).exec();
  await Promise.all(
    payments
      .filter((payment) => payment.paymentStatus === "SUCCEEDED" && !payment.receiptNumber)
      .map((payment) => ensureSuccessfulPaymentReceipt(payment._id)),
  );

  const refreshedPayments = await Payment.aggregate(pipeline).exec();
  return refreshedPayments;
}

export async function getActivePlans(limit = 0) {
  await connectToDatabase();

  const query = Plan.find({ isActive: true })
    .select(
      "name description durationMonths baseMonthlyPrice discountPercentage allowPartialPayment benefits isPopular",
    )
    .sort({ baseMonthlyPrice: 1, durationMonths: 1 });

  if (limit) {
    query.limit(limit);
  }

  return query.lean().exec();
}

export async function getMemberProfileData(userId) {
  await connectToDatabase();
  const [subscription, subscriptionCount] = await Promise.all([
    Subscription.findOne({ userId, status: { $ne: "CANCELLED" } })
      .sort({ createdAt: -1 })
      .select("planNameSnapshot status startDate endDate")
      .lean()
      .exec(),
    Subscription.countDocuments({ userId, status: { $ne: "CANCELLED" } }),
  ]);
  return { subscription, subscriptionCount };
}

export async function getMemberSubscriptions(userId) {
  await connectToDatabase();
  return Subscription.find({ userId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
}

export async function getMemberSubscriptionDetails(userId, subscriptionId) {
  if (!mongoose.isValidObjectId(subscriptionId)) {
    return null;
  }

  await connectToDatabase();
  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    userId,
  })
    .lean()
    .exec();

  if (!subscription) {
    return null;
  }

  const payments = await Payment.find({
    subscriptionId: subscription._id,
    userId,
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean()
    .exec();

  await Promise.all(
    payments
      .filter((payment) => payment.paymentStatus === "SUCCEEDED" && !payment.receiptNumber)
      .map((payment) => ensureSuccessfulPaymentReceipt(payment._id)),
  );

  const refreshedPayments = await Payment.find({
    subscriptionId: subscription._id,
    userId,
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean()
    .exec();

  return { subscription, payments: refreshedPayments };
}

export async function getMemberDashboardData(userId) {
  await connectToDatabase();

  const [subscription, subscriptionCount, totals, recentPayments, availablePlans] =
    await Promise.all([
      Subscription.findOne({ userId, status: { $ne: "CANCELLED" } })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      Subscription.countDocuments({ userId, status: { $ne: "CANCELLED" } }),
      getAccountTotals(userId),
      getUserPayments(userId, { limit: 5 }),
      Plan.find({ isActive: true })
        .select(
          "name description durationMonths baseMonthlyPrice discountPercentage allowPartialPayment benefits isPopular",
        )
        .sort({ baseMonthlyPrice: 1, durationMonths: 1 })
        .limit(3)
        .lean()
        .exec(),
    ]);

  return {
    subscription,
    subscriptionCount,
    ...totals,
    recentPayments,
    availablePlans,
  };
}

export async function getBillingData(
  userId,
  { status = "all", search = "", page = 1, pageSize = 50 } = {},
) {
  await connectToDatabase();

  const filter = await getPaymentFilter(userId, { status, search });
  const [totals, payments, payableSubscriptions, pendingTotals, paymentCounts] = await Promise.all([
    getAccountTotals(userId),
    getUserPayments(userId, {
      status,
      search,
      skip: (page - 1) * pageSize,
      limit: pageSize,
    }),
    Subscription.find({
      userId,
      remainingBalance: { $gt: 0 },
      status: { $in: ["PARTIAL", "PENDING", "ACTIVE", "EXPIRED"] },
    })
      .select(
        "planNameSnapshot totalAmount amountPaid remainingBalance nextPaymentDueDate",
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec(),
    Payment.aggregate([
      { $match: { userId, paymentStatus: "PENDING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: filter },
      ...getSubscriptionOwnershipStages(userId),
      { $count: "total" },
    ]),
  ]);

  const totalPaymentCount = paymentCounts[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPaymentCount / pageSize));

  return {
    ...totals,
    pendingTotal: pendingTotals[0]?.total ?? 0,
    payments,
    payableSubscriptions,
    page,
    pageSize,
    totalPaymentCount,
    totalPages,
  };
}

export function getPaymentDisplayStatus(payment) {
  return getPaymentDisplayStatusValue(payment);
}
