import mongoose from "mongoose";
import { isNonNegativePaise } from "../lib/currency.js";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["FLAT", "PERCENTAGE"],
      required: true,
    },
    // FLAT values use integer INR paise; PERCENTAGE values are 0-100.
    discountValue: {
      type: Number,
      required: true,
      validate: {
        validator(value) {
          if (this.discountType === "FLAT") {
            return isNonNegativePaise(value);
          }

          return Number.isFinite(value) && value >= 0 && value <= 100;
        },
        message:
          "Flat discounts must be integer INR paise; percentage discounts must be between 0 and 100.",
      },
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value == null || Number.isInteger(value),
        message: "Usage limit must be a whole number.",
      },
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Usage count must be a whole number.",
      },
    },
    minimumPurchaseAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: isNonNegativePaise,
        message: "Minimum purchase must be non-negative integer INR paise.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

export default Coupon;
