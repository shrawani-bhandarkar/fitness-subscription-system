export function canAccessPaymentReceipt({ payment, currentUserId, isAdmin }) {
  if (!payment || payment.paymentStatus !== "SUCCEEDED" || !payment.receiptNumber) {
    return false;
  }
  if (isAdmin) {
    return true;
  }
  return Boolean(
    currentUserId &&
      payment.userId &&
      String(payment.userId) === String(currentUserId),
  );
}
