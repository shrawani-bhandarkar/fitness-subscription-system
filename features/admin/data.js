import "server-only";

import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db.js";
import AdminAudit from "../../models/AdminAudit.js";
import Coupon from "../../models/Coupon.js";
import Payment from "../../models/Payment.js";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";

const ADMIN_PAGE_SIZE = 50;
const ADMIN_EDITOR_PAGE_SIZE = 20;
const CURRENT_MEMBERSHIP_STATUSES = ["ACTIVE", "PARTIAL"];

function normalizePage(page) {
  const parsed = Number.parseInt(page, 10);
  return Number.isSafeInteger(parsed) ? Math.max(1, Math.min(parsed, 1_000_000)) : 1;
}

export async function getAdminOverview() {
  await connectToDatabase();
  const now = new Date();
  const currentMembershipFilter = {
    status: { $in: CURRENT_MEMBERSHIP_STATUSES },
    startDate: { $lte: now },
    endDate: { $gt: now },
  };
  const [
    members,
    activeMemberIds,
    totalSubscriptions,
    activeSubscriptions,
    expiredSubscriptions,
    planCount,
    paid,
    pending,
    partial,
    recentTransactions,
    recentMembers,
  ] =
    await Promise.all([
      User.countDocuments({ role: { $in: ["MEMBER", "USER"] } }),
      Subscription.distinct("userId", currentMembershipFilter).exec(),
      Subscription.countDocuments({}),
      Subscription.countDocuments(currentMembershipFilter),
      Subscription.countDocuments({
        $or: [
          { status: "EXPIRED" },
          {
            status: { $nin: ["CANCELLED", "EXPIRED"] },
            endDate: { $lte: now },
          },
        ],
      }),
      Plan.countDocuments({}),
      Payment.aggregate([
        { $match: { paymentStatus: "SUCCEEDED" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: "PENDING" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Subscription.aggregate([
        { $match: { status: { $in: ["PARTIAL", "PENDING"] } } },
        { $group: { _id: null, total: { $sum: "$remainingBalance" } } },
      ]),
      Payment.find({})
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(5)
        .populate({ path: "userId", select: "name email" })
        .populate({
          path: "subscriptionId",
          select: "planNameSnapshot",
        })
        .lean()
        .exec(),
      User.find({ role: { $in: ["MEMBER", "USER"] } })
        .select("name email registeredAt createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);
  const activeMembers = await User.countDocuments({
    role: { $in: ["MEMBER", "USER"] },
    _id: { $in: activeMemberIds },
  });

  return {
    members,
    activeMembers,
    inactiveMembers: Math.max(0, members - activeMembers),
    totalSubscriptions,
    activeSubscriptions,
    expiredSubscriptions,
    planCount,
    collected: paid[0]?.total ?? 0,
    pendingPayments: (pending[0]?.total ?? 0) + (partial[0]?.total ?? 0),
    recentTransactions,
    recentMembers,
  };
}

export async function getAdminPlans(page = 1) {
  await connectToDatabase();
  const totalCount = await Plan.countDocuments({});
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_EDITOR_PAGE_SIZE));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const plans = await Plan.find({})
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ADMIN_EDITOR_PAGE_SIZE)
    .limit(ADMIN_EDITOR_PAGE_SIZE)
    .lean()
    .exec();
  return {
    records: plans.map((plan) => ({ ...plan, _id: plan._id.toString() })),
    totalCount,
    currentPage,
    totalPages,
  };
}

export async function getAdminCoupons(page = 1) {
  await connectToDatabase();
  const totalCount = await Coupon.countDocuments({});
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_EDITOR_PAGE_SIZE));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const coupons = await Coupon.find({})
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ADMIN_EDITOR_PAGE_SIZE)
    .limit(ADMIN_EDITOR_PAGE_SIZE)
    .lean()
    .exec();
  return {
    records: coupons.map((coupon) => ({ ...coupon, _id: coupon._id.toString() })),
    totalCount,
    currentPage,
    totalPages,
  };
}

export async function getAdminSubscriptions(search = "", status = "all", page = 1) {
  await connectToDatabase();
  const filter = {};
  if (["PENDING", "PARTIAL", "ACTIVE", "EXPIRED", "CANCELLED"].includes(status)) {
    filter.status = status;
  }
  if (search.trim()) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: escapeRegex(search.trim()), $options: "i" } },
        { email: { $regex: escapeRegex(search.trim()), $options: "i" } },
      ],
    })
      .select("_id")
      .lean()
      .exec();
    const userIds = matchingUsers.map(({ _id }) => _id);
    filter.$or = [
      { planNameSnapshot: { $regex: escapeRegex(search.trim()), $options: "i" } },
      { userId: { $in: userIds } },
      { memberReference: { $regex: escapeRegex(search.trim()), $options: "i" } },
    ];
  }
  const totalCount = await Subscription.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const subscriptions = await Subscription.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .populate({ path: "userId", select: "name email" })
    .lean()
    .exec();
  return { records: subscriptions, totalCount, currentPage, totalPages };
}

export async function getAdminTransactions({
  search = "",
  status = "all",
  from = "",
  to = "",
  page = 1,
} = {}) {
  await connectToDatabase();
  const filter = {};
  if (["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"].includes(status)) {
    filter.paymentStatus = status;
  } else if (status === "PARTIAL") {
    filter.paymentStatus = "SUCCEEDED";
    filter.remainingBalanceAfterPayment = { $gt: 0 };
  } else if (status === "COMPLETED") {
    filter.paymentStatus = "SUCCEEDED";
    filter.$and = [
      {
        $or: [
          { remainingBalanceAfterPayment: 0 },
          { remainingBalanceAfterPayment: null },
        ],
      },
    ];
  }
  if (from || to) {
    const dateRange = {};
    if (from) dateRange.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) dateRange.$lte = new Date(`${to}T23:59:59.999Z`);
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { paymentDate: dateRange },
          { paymentDate: null, createdAt: dateRange },
        ],
      },
    ];
  }

  const searchValue = search.trim();
  if (searchValue) {
    const userSearch = [
      { name: { $regex: escapeRegex(searchValue), $options: "i" } },
      { email: { $regex: escapeRegex(searchValue), $options: "i" } },
    ];
    if (mongoose.isValidObjectId(searchValue)) {
      userSearch.push({ _id: searchValue });
    }
    const matchingUsers = await User.find({ $or: userSearch })
      .select("_id")
      .lean()
      .exec();
    const matchingSubscriptions = await Subscription.find({
      invoiceNumber: { $regex: escapeRegex(searchValue), $options: "i" },
    })
      .select("_id")
      .lean()
      .exec();
    filter.$or = [
      { receiptNumber: { $regex: escapeRegex(searchValue), $options: "i" } },
      { subscriptionId: { $in: matchingSubscriptions.map(({ _id }) => _id) } },
      { transactionReference: { $regex: escapeRegex(searchValue), $options: "i" } },
      { userId: { $in: matchingUsers.map(({ _id }) => _id) } },
      { memberReference: { $regex: escapeRegex(searchValue), $options: "i" } },
    ];
  }

  const totalCount = await Payment.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const transactions = await Payment.find(filter)
    .sort({ paymentDate: -1, createdAt: -1 })
    .skip((currentPage - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .populate({ path: "userId", select: "name email" })
    .populate({
      path: "subscriptionId",
      select: "planNameSnapshot invoiceNumber totalAmount amountPaid remainingBalance",
    })
    .lean()
    .exec();
  return { records: transactions, totalCount, currentPage, totalPages };
}

export async function getAdminMembers(search = "", page = 1, membership = "all") {
  await connectToDatabase();
  const filter = { role: { $in: ["MEMBER", "USER"] } };
  if (search.trim()) {
    const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }, { clerkUserId: regex }];
  }
  if (["ACTIVE", "EXPIRED", "PARTIAL", "NONE"].includes(membership)) {
    const now = new Date();
    const subscriptionFilter =
      membership === "ACTIVE"
        ? { status: "ACTIVE", endDate: { $gt: now } }
        : membership === "EXPIRED"
          ? {
              $or: [
                { status: "EXPIRED" },
                {
                  status: { $nin: ["CANCELLED", "EXPIRED"] },
                  endDate: { $lte: now },
                },
              ],
            }
          : membership === "PARTIAL"
            ? { status: { $in: ["PARTIAL", "PENDING"] } }
            : { status: { $ne: "CANCELLED" } };
    const userIds = await Subscription.distinct("userId", subscriptionFilter).exec();
    filter._id = membership === "NONE" ? { $nin: userIds } : { $in: userIds };
  }

  const totalCount = await User.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const users = await User.find(filter)
    .select("name email phone address registeredAt createdAt")
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .lean()
    .exec();
  if (!users.length) {
    return { records: [], totalCount, currentPage, totalPages };
  }

  const ids = users.map(({ _id }) => _id);
  const [subscriptions, payments] = await Promise.all([
    Subscription.aggregate([
      { $match: { userId: { $in: ids }, status: { $ne: "CANCELLED" } } },
      { $group: { _id: "$userId", count: { $sum: 1 }, outstanding: { $sum: "$remainingBalance" } } },
    ]),
    Payment.aggregate([
      { $match: { userId: { $in: ids }, paymentStatus: "SUCCEEDED" } },
      { $group: { _id: "$userId", paid: { $sum: "$amount" } } },
    ]),
  ]);
  const subscriptionByUser = new Map(subscriptions.map((item) => [String(item._id), item]));
  const paymentByUser = new Map(payments.map((item) => [String(item._id), item]));

  return {
    records: users.map((user) => ({
      ...user,
      subscriptionSummary: subscriptionByUser.get(String(user._id)) ?? { count: 0, outstanding: 0 },
      paymentSummary: paymentByUser.get(String(user._id)) ?? { paid: 0 },
    })),
    totalCount,
    currentPage,
    totalPages,
  };
}

export async function getAdminMemberDetails(memberId) {
  if (!mongoose.isValidObjectId(memberId)) {
    return null;
  }

  await connectToDatabase();
  const member = await User.findOne({
    _id: memberId,
    role: { $in: ["MEMBER", "USER"] },
  })
    .select("name email phone address clerkUserId registeredAt createdAt")
    .lean()
    .exec();
  if (!member) {
    return null;
  }

  const [subscriptions, payments] = await Promise.all([
    Subscription.find({ userId: member._id })
      .sort({ createdAt: -1 })
      .populate({ path: "planId", select: "name" })
      .lean()
      .exec(),
    Payment.find({ userId: member._id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(100)
      .populate({
        path: "subscriptionId",
        select: "planNameSnapshot totalAmount amountPaid remainingBalance",
      })
      .lean()
      .exec(),
  ]);

  return { member, subscriptions, payments };
}

export async function getRecentAdminAudits(limit = 8) {
  await connectToDatabase();
  return AdminAudit.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: "adminUserId", select: "name email" })
    .lean()
    .exec();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
