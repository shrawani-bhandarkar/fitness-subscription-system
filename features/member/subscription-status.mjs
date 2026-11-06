export function getSubscriptionStatus(subscription, now = Date.now()) {
  if (!subscription) {
    return null;
  }

  if (subscription.status === "CANCELLED") {
    return "CANCELLED";
  }

  const endDate = subscription.endDate
    ? new Date(subscription.endDate).getTime()
    : Number.NaN;
  const nowTimestamp = now instanceof Date ? now.getTime() : now;
  if (
    subscription.status === "EXPIRED" ||
    (Number.isFinite(endDate) && endDate <= nowTimestamp)
  ) {
    return "EXPIRED";
  }

  return subscription.status;
}
