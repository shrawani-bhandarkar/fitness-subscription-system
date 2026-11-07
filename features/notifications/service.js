import "server-only";

import { connectToDatabase } from "../../lib/db.js";
import Notification from "../../models/Notification.js";
import Subscription from "../../models/Subscription.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toISOStringOrNull(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function serializeNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    _id: notification._id ? String(notification._id) : null,
    subscriptionId: notification.subscriptionId ? String(notification.subscriptionId) : null,
    userId: notification.userId ? String(notification.userId) : null,
    type: notification.type ? String(notification.type) : null,
    title: notification.title ? String(notification.title) : "",
    message: notification.message ? String(notification.message) : "",
    link: notification.link ? String(notification.link) : null,
    readAt: toISOStringOrNull(notification.readAt),
    createdAt: toISOStringOrNull(notification.createdAt) || new Date(0).toISOString(),
    updatedAt: toISOStringOrNull(notification.updatedAt) || new Date(0).toISOString(),
  };
}

function formatDate(date) {
  if (!date) {
    return "Not recorded";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export async function getMemberNotifications(userId, { limit = 20 } = {}) {
  await connectToDatabase();

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean()
    .exec();

  return notifications.map(serializeNotification);
}

export async function getUnreadNotificationCount(userId) {
  await connectToDatabase();

  return Notification.countDocuments({
    userId,
    readAt: null,
  }).exec();
}

export async function createSubscriptionNotification({
  userId,
  subscriptionId,
  type,
  title,
  message,
  link,
}) {
  if (!userId || !type || !title || !message || !link) {
    return null;
  }

  await connectToDatabase();

  const notification = await Notification.findOneAndUpdate(
    { userId, subscriptionId, type },
    {
      $setOnInsert: {
        userId,
        subscriptionId,
        type,
      },
      $set: {
        title,
        message,
        link,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean().exec();

  return serializeNotification(notification);
}

export async function ensureMembershipActivationNotification({
  userId,
  subscriptionId,
  planName,
  previousStatus,
  startDate,
  endDate,
}) {
  if (!userId || !subscriptionId || !planName) {
    return null;
  }

  if (previousStatus === "ACTIVE") {
    return null;
  }

  const activeSubscription = await Subscription.findById(subscriptionId)
    .select("status")
    .lean()
    .exec();

  if (!activeSubscription || activeSubscription.status !== "ACTIVE") {
    return null;
  }

  const activationDate = startDate ? formatDate(startDate) : "today";
  const expiryDateText = endDate ? formatDate(endDate) : "your membership term";

  return createSubscriptionNotification({
    userId,
    subscriptionId,
    type: "ACTIVATION",
    title: `Your ${planName} membership is now active!`,
    message: `Activated on ${activationDate}. Expires on ${expiryDateText}.`,
    link: `/subscriptions/${String(subscriptionId)}`,
  });
}

export async function ensureThreeDayExpiryWarnings(now = new Date()) {
  await connectToDatabase();

  const activeSubscriptions = await Subscription.find({
    status: "ACTIVE",
    endDate: { $gt: now },
  })
    .select("_id userId planNameSnapshot endDate")
    .lean()
    .exec();

  let createdCount = 0;

  for (const subscription of activeSubscriptions) {
    const endDate = new Date(subscription.endDate);
    const remainingMs = endDate.getTime() - new Date(now).getTime();
    const daysRemaining = Math.ceil(remainingMs / DAY_MS);

    if (daysRemaining !== 3) {
      continue;
    }

    const notification = await createSubscriptionNotification({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      type: "EXPIRY_WARNING",
      title: `Your ${subscription.planNameSnapshot} membership expires in 3 days. Renew now to continue enjoying your benefits.`,
      message: `Your membership expires on ${formatDate(endDate)}. Renew now to continue enjoying your benefits.`,
      link: "/billing",
    });

    if (notification) {
      createdCount += 1;
    }
  }

  return createdCount;
}
