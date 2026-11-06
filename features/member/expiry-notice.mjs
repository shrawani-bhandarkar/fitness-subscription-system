const DAY_MS = 24 * 60 * 60 * 1000;

export function getSubscriptionExpiryNotice(subscription, now = new Date()) {
  if (!subscription?.endDate) {
    return null;
  }

  const endDate = new Date(subscription.endDate);
  if (Number.isNaN(endDate.getTime())) {
    return null;
  }

  const nowTime = now instanceof Date ? now.getTime() : now;
  if (subscription.status === "CANCELLED") {
    return null;
  }
  if (subscription.status === "EXPIRED" || endDate.getTime() <= nowTime) {
    return { type: "expired", endDate };
  }
  if (
    subscription.status === "ACTIVE" &&
    endDate.getTime() - nowTime <= 7 * DAY_MS
  ) {
    return {
      type: "expiring",
      endDate,
      daysRemaining: Math.max(1, Math.ceil((endDate.getTime() - nowTime) / DAY_MS)),
    };
  }

  return null;
}
