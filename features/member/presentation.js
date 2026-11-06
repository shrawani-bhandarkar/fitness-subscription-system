export function formatINR(amountInPaise) {
  if (!Number.isFinite(amountInPaise)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amountInPaise / 100);
}

export function formatDate(date) {
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

export { getSubscriptionStatus } from "@/features/member/subscription-status.mjs";

export function getSubscriptionProgress(subscription) {
  if (!subscription?.startDate || !subscription?.endDate) {
    return null;
  }

  const start = new Date(subscription.startDate).getTime();
  const end = new Date(subscription.endDate).getTime();
  const duration = end - start;

  if (!Number.isFinite(start) || !Number.isFinite(end) || duration <= 0) {
    return null;
  }

  return Math.min(100, Math.max(0, ((Date.now() - start) / duration) * 100));
}
