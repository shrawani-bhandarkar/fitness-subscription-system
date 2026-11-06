import mongoose from "mongoose";
import { isNonNegativePaise } from "../lib/currency.js";
import { isSubscriptionAccountingConsistent } from "../features/subscriptions/accounting.mjs";

const subscriptionSchema = new mongoose.Schema(
  {
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
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "ACTIVE", "EXPIRED", "CANCELLED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    nextPaymentDueDate: {
      type: Date,
      default: null,
    },
    // All monetary values in the application are integer INR paise.
    totalAmount: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativePaise,
        message: "Total amount must be a non-negative integer in INR paise.",
      },
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: "Amount paid must be a non-negative integer in INR paise.",
      },
    },
    remainingBalance: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativePaise,
        message: "Remaining balance must be a non-negative integer in INR paise.",
      },
    },
    planNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    invoiceIssuedAt: {
      type: Date,
      default: null,
    },
    planAmountBeforeDiscountSnapshot: {
      type: Number,
      default: null,
      validate: {
        validator: (value) => value == null || isNonNegativePaise(value),
        message: "Invoice plan amount must be non-negative integer INR paise.",
      },
    },
    planDiscountPaiseSnapshot: {
      type: Number,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: "Plan discount must be non-negative integer INR paise.",
      },
    },
    baseMonthlyPriceSnapshot: {
      type: Number,
      required: true,
      validate: {
        validator: isNonNegativePaise,
        message:
          "Plan price snapshot must be a non-negative integer in INR paise.",
      },
    },
    discountPercentageSnapshot: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    durationMonthsSnapshot: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Duration snapshot must be a whole number of months.",
      },
    },
    benefitsSnapshot: {
      type: [String],
      default: [],
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
    balanceWaivedPaise: {
      type: Number,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: "Waived balance must be non-negative integer INR paise.",
      },
    },
    balanceWaivedReason: {
      type: String,
      default: null,
      trim: true,
    },
    balanceWaivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    balanceWaivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

subscriptionSchema.pre("validate", function validateAccounting() {
  if (!isSubscriptionAccountingConsistent(this)) {
    this.invalidate(
      "remainingBalance",
      "Paid, outstanding, and waived balances must equal the subscription total in INR paise.",
    );
  }
});

subscriptionSchema.index({ userId: 1, createdAt: -1 });

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
