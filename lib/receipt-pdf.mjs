import { getReceiptPaymentStatus } from "../features/billing/payment-status.mjs";

function ascii(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value) {
  return ascii(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function money(amount) {
  const value = Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  const whole = Math.floor(value / 100).toLocaleString("en-IN");
  return `INR ${whole}.${String(value % 100).padStart(2, "0")}`;
}

function yFromTop(top) {
  return 842 - top;
}

function drawText(x, top, size, value, color = "0.12 0.18 0.25") {
  return `BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x} ${yFromTop(top + size)} Tm (${escapePdfText(value)}) Tj ET`;
}

function drawLine(x1, top, x2, color = "0.86 0.89 0.91") {
  const y = yFromTop(top);
  return `${color} RG 0.8 w ${x1} ${y} m ${x2} ${y} l S`;
}

function drawRect(x, top, width, height, color) {
  const bottom = 842 - top - height;
  return `${color} rg ${x} ${bottom} ${width} ${height} re f`;
}

function drawField(commands, x, top, label, value, width = 250) {
  commands.push(drawText(x, top, 8, label.toUpperCase(), "0.40 0.46 0.52"));
  commands.push(drawText(x, top + 14, 10, String(value || "Not available").slice(0, width)));
}

export function createPaymentReceiptPdf({
  payment,
  subscription,
  member,
  businessName = "Fitness Club",
  businessContact = "",
}) {
  if (
    payment.paymentStatus !== "SUCCEEDED" ||
    !payment.receiptNumber ||
    !subscription.invoiceNumber
  ) {
    throw new Error("A receipt is available only for confirmed successful payments.");
  }

  const paidAt = new Date(payment.paymentDate ?? payment.createdAt);
  if (Number.isNaN(paidAt.getTime())) {
    throw new Error("The confirmed payment has no valid payment date.");
  }
  const paymentStatus = getReceiptPaymentStatus(payment);
  const memberId =
    member.memberId ??
    payment.memberSnapshot?.memberId ??
    payment.userId ??
    payment.memberReference ??
    "Not available";
  const duration = Number.isInteger(subscription.durationMonthsSnapshot)
    ? `${subscription.durationMonthsSnapshot} month${subscription.durationMonthsSnapshot === 1 ? "" : "s"}`
    : "Not available";
  const planDiscount = subscription.planDiscountPaiseSnapshot ?? 0;
  const couponDiscount = subscription.couponDiscountPaiseSnapshot ?? 0;
  const amountPaid = payment.totalPaidAfterPaymentSnapshot ?? payment.amount;
  const remainingBalance =
    payment.remainingBalanceAfterPayment ?? subscription.remainingBalance;

  const commands = [
    drawRect(0, 0, 612, 124, "0.07 0.20 0.23"),
    drawText(48, 29, 21, businessName, "1 1 1"),
    ...(businessContact
      ? [drawText(48, 57, 9, businessContact, "0.82 0.91 0.89")]
      : []),
    drawText(48, 88, 12, "PAYMENT RECEIPT", "0.82 0.91 0.89"),
    drawText(468, 43, 10, paymentStatus, "1 1 1"),
    drawText(48, 146, 8, "RECEIPT NUMBER", "0.40 0.46 0.52"),
    drawText(48, 161, 11, payment.receiptNumber),
    drawText(340, 146, 8, "INVOICE NUMBER", "0.40 0.46 0.52"),
    drawText(340, 161, 11, subscription.invoiceNumber),
    drawText(48, 188, 8, "PAYMENT / TRANSACTION ID", "0.40 0.46 0.52"),
    drawText(48, 203, 9, `${payment._id ?? payment.paymentId ?? "Not available"} · ${payment.transactionReference ?? "No external reference"}`),
    drawText(340, 188, 8, "PAYMENT DATE AND TIME", "0.40 0.46 0.52"),
    drawText(340, 203, 9, paidAt.toISOString()),
    drawLine(48, 228, 564),
    drawText(48, 244, 10, "MEMBER", "0.07 0.20 0.23"),
    drawText(326, 244, 10, "PLAN", "0.07 0.20 0.23"),
  ];

  drawField(commands, 48, 264, "Name", member.name);
  drawField(commands, 48, 305, "Email", member.email);
  drawField(commands, 48, 346, "Member ID", memberId);
  drawField(commands, 326, 264, "Plan name", subscription.planNameSnapshot);
  drawField(commands, 326, 305, "Duration", duration);
  drawField(commands, 326, 346, "Payment method", payment.paymentMethod?.replaceAll("_", " ") ?? "Not available");

  commands.push(drawLine(48, 387, 564));
  commands.push(drawText(48, 403, 10, "PAYMENT BREAKDOWN", "0.07 0.20 0.23"));

  const rows = [
    ["Original plan price", money(subscription.planAmountBeforeDiscountSnapshot)],
    ["Plan discount", `-${money(planDiscount)}`],
    [
      subscription.couponCodeSnapshot
        ? `Coupon discount (${subscription.couponCodeSnapshot})`
        : "Coupon discount",
      `-${money(couponDiscount)}`,
    ],
    ["Final subscription amount", money(subscription.totalAmount)],
  ];
  rows.forEach(([label, amount], index) => {
    const top = 428 + index * 25;
    commands.push(drawText(48, top, 9, label));
    commands.push(drawText(430, top, 9, amount));
  });

  commands.push(drawRect(48, 540, 516, 68, "0.91 0.96 0.94"));
  commands.push(drawText(66, 552, 9, "AMOUNT RECEIVED IN THIS PAYMENT", "0.18 0.34 0.30"));
  commands.push(drawText(66, 570, 20, money(payment.amount), "0.04 0.37 0.27"));
  commands.push(drawText(364, 550, 8, "TOTAL PAID", "0.40 0.46 0.52"));
  commands.push(drawText(364, 565, 11, money(amountPaid)));
  commands.push(drawText(464, 550, 8, "BALANCE", "0.40 0.46 0.52"));
  commands.push(drawText(464, 565, 11, money(remainingBalance)));
  commands.push(drawLine(48, 633, 564));
  commands.push(drawText(48, 649, 9, `Payment status: ${paymentStatus}`));
  commands.push(drawText(48, 670, 8, "This receipt records the payment shown above against the referenced subscription invoice."));
  if (payment.isDemoPayment) {
    commands.push(drawText(48, 690, 8, "DEMO PAYMENT - no money was charged", "0.60 0.32 0.03"));
  }
  commands.push(drawLine(48, 744, 564));
  commands.push(drawText(48, 760, 8, `${businessName} · Generated from the application's recorded billing data.`, "0.40 0.46 0.52"));

  const stream = `${commands.join("\n")}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(document).length);
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(document).length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(document);
}
