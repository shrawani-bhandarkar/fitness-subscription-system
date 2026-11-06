export function isSubscriptionAccountingConsistent({
  totalAmount,
  amountPaid,
  remainingBalance,
  balanceWaivedPaise = 0,
}) {
  const amounts = [
    totalAmount,
    amountPaid,
    remainingBalance,
    balanceWaivedPaise,
  ];
  return (
    amounts.every((value) => Number.isSafeInteger(value) && value >= 0) &&
    amountPaid + remainingBalance + balanceWaivedPaise === totalAmount
  );
}
