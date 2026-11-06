export function getPaymentDisplayStatus(payment) {
  if (payment.paymentStatus === "SUCCEEDED") {
    return payment.remainingBalanceAfterPayment > 0
      ? "PARTIAL"
      : "SUCCEEDED";
  }

  return payment.paymentStatus;
}

export function getReceiptPaymentStatus(payment) {
  if (payment.paymentStatus !== "SUCCEEDED") {
    return payment.paymentStatus;
  }
  return payment.remainingBalanceAfterPayment > 0 ? "PARTIAL" : "COMPLETED";
}
