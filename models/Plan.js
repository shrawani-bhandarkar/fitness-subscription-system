import mongoose from "mongoose";
import { isPositivePaise } from "../lib/currency.js";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of months.",
      },
    },
    // All monetary values in the application are integer INR paise.
    baseMonthlyPrice: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => Number.isSafeInteger(value) && isPositivePaise(value),
        message: "Base monthly price must be a positive integer in INR paise.",
      },
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 99.99,
    },
    benefits: {
      type: [String],
      default: [],
      validate: {
        validator: (items) =>
          items.length <= 20 &&
          items.every((item) => typeof item === "string" && item.trim() && item.length <= 120),
        message: "Plans may have at most 20 non-empty benefits.",
      },
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    allowPartialPayment: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

planSchema.index({ isActive: 1, createdAt: -1 });
planSchema.index({ createdAt: -1 });

const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

export default Plan;
