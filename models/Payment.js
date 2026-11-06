import mongoose from "mongoose";
import { isNonNegativePaise, isPositivePaise } from "../lib/currency.js";

const paymentSchema = new mongoose.Schema(
  {
    memberSnapshot: {
      memberId: { type: String, trim: true, default: null },
      name: { type: String, trim: true, default: null },
      email: { type: String, trim: true, lowercase: true, default: null },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    memberReference: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    memberDeletedAt: {
      type: Date,
      default: null,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    // All monetary values in the application are integer INR paise.
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: isPositivePaise,
        message: "Payment amount must be a positive integer in INR paise.",
      },
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    isDemoPayment: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ["CARD", "UPI", "NET_BANKING", "CASH", "BANK_TRANSFER", "OTHER"],
      required: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    idempotencyFingerprint: {
      type: String,
      trim: true,
      default: null,
    },
    receiptNumber: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    receiptIssuedAt: {
      type: Date,
      default: null,
    },
    totalSubscriptionAmountSnapshot: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || isNonNegativePaise(value),
        message: "Receipt subscription amount must be non-negative integer INR paise.",
      },
    },
    totalPaidAfterPaymentSnapshot: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || isNonNegativePaise(value),
        message: "Receipt paid total must be non-negative integer INR paise.",
      },
    },
    remainingBalanceAfterPayment: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || Number.isInteger(value) && value >= 0,
        message: "Recorded remaining balance must be non-negative integer INR paise.",
      },
    },
    couponCodeSnapshot: {
      type: String,
      default: null,
      trim: true,
    },
    couponDiscountPaiseSnapshot: {
      type: Number,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: "Coupon discount must be non-negative integer INR paise.",
      },
    },
    paymentDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
