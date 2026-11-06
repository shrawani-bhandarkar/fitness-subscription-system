import assert from "node:assert/strict";
import test from "node:test";
import { createPaymentReceiptPdf } from "../lib/receipt-pdf.mjs";
import { getReceiptPaymentStatus } from "../features/billing/payment-status.mjs";
import { canAccessPaymentReceipt } from "../features/billing/receipt-access.mjs";

const payment = {
  paymentStatus: "SUCCEEDED",
  _id: "payment-123",
  receiptNumber: "RCP-2026-0123456789ABCDEF",
  paymentDate: new Date("2026-11-06T12:00:00.000Z"),
  createdAt: new Date("2026-11-06T12:00:00.000Z"),
  amount: 7000,
  totalPaidAfterPaymentSnapshot: 7000,
  remainingBalanceAfterPayment: 17_300,
  paymentMethod: "UPI",
  transactionReference: "DEMO-REFERENCE",
  isDemoPayment: true,
  memberSnapshot: {
    memberId: "member-123",
    name: "Test Member",
    email: "member@example.test",
  },
};
const subscription = {
  invoiceNumber: "INV-2026-FEDCBA9876543210",
  planNameSnapshot: "Gold Plan",
  durationMonthsSnapshot: 6,
  planAmountBeforeDiscountSnapshot: 30_000,
  planDiscountPaiseSnapshot: 3_000,
  couponCodeSnapshot: "FESTIVE10",
  couponDiscountPaiseSnapshot: 2_700,
  totalAmount: 24_300,
};
const member = {
  name: "Test Member",
  email: "member@example.test",
  memberId: "member-123",
};

test("generates a professional partial-payment receipt with complete references and totals", () => {
  const pdf = createPaymentReceiptPdf({
    payment,
    subscription,
    member,
    businessName: "Fitness Club",
    businessContact: "support@example.test",
  });
  const content = new TextDecoder().decode(pdf);
  assert.ok(content.startsWith("%PDF-1.4"));
  assert.match(content, /RCP-2026-0123456789ABCDEF/);
  assert.match(content, /INV-2026-FEDCBA9876543210/);
  assert.match(content, /payment-123/);
  assert.match(content, /member-123/);
  assert.match(content, /Gold Plan/);
  assert.match(content, /INR 243\.00/);
  assert.match(content, /INR 300\.00/);
  assert.match(content, /INR 70\.00/);
  assert.match(content, /INR 173\.00/);
  assert.match(content, /FESTIVE10/);
  assert.match(content, /PARTIAL/);
  assert.match(content, /support@example\.test/);
  assert.match(content, /DEMO PAYMENT/);
  assert.match(content, /startxref/);
});

test("does not generate receipts for pending or failed payment records", () => {
  for (const paymentStatus of ["PENDING", "FAILED", "REFUNDED", "CANCELLED"]) {
    assert.throws(
      () =>
        createPaymentReceiptPdf({
          payment: { ...payment, paymentStatus },
          subscription,
          member,
        }),
      /only for confirmed successful payments/,
    );
  }
});

test("labels partial and final successful installments accurately", () => {
  assert.equal(getReceiptPaymentStatus(payment), "PARTIAL");
  assert.equal(
    getReceiptPaymentStatus({
      ...payment,
      remainingBalanceAfterPayment: 0,
    }),
    "COMPLETED",
  );
});

test("receipt access is limited to the owner or an administrator", () => {
  const succeeded = {
    ...payment,
    userId: "owner-id",
  };
  assert.equal(
    canAccessPaymentReceipt({
      payment: succeeded,
      currentUserId: "owner-id",
      isAdmin: false,
    }),
    true,
  );
  assert.equal(
    canAccessPaymentReceipt({
      payment: succeeded,
      currentUserId: "other-id",
      isAdmin: false,
    }),
    false,
  );
  assert.equal(
    canAccessPaymentReceipt({
      payment: succeeded,
      currentUserId: "admin-id",
      isAdmin: true,
    }),
    true,
  );
  assert.equal(
    canAccessPaymentReceipt({
      payment: { ...succeeded, paymentStatus: "PENDING" },
      currentUserId: "admin-id",
      isAdmin: true,
    }),
    false,
  );
});
