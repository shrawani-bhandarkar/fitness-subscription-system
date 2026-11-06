import nextEnv from "@next/env";
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Plan from "../models/Plan.js";
import { getDevelopmentMongoUri } from "./development-database.mjs";

nextEnv.loadEnvConfig(process.cwd());

const expectedDatabaseName = "fitness_subscription_dev";
const uri = getDevelopmentMongoUri();

if (process.env.NODE_ENV === "production") {
  throw new Error("Development seed is disabled when NODE_ENV=production.");
}
if (process.env.FSS_ALLOW_DEV_SEED !== "true") {
  throw new Error("Set FSS_ALLOW_DEV_SEED=true to explicitly enable development seeding.");
}
const plans = [
  {
    name: "Development Starter Membership",
    description: "A one-month membership for trying the club.",
    durationMonths: 1,
    baseMonthlyPrice: 49900,
    discountPercentage: 0,
    benefits: ["Gym floor access", "Fitness orientation"],
    allowPartialPayment: false,
    isPopular: false,
    isActive: true,
  },
  {
    name: "Development Progress Membership",
    description: "A three-month plan for building a consistent routine.",
    durationMonths: 3,
    baseMonthlyPrice: 44900,
    discountPercentage: 5,
    benefits: ["Gym floor access", "Fitness orientation", "Group classes"],
    allowPartialPayment: true,
    isPopular: true,
    isActive: true,
  },
  {
    name: "Development Training Membership",
    description: "A one-year membership for long-term training goals.",
    durationMonths: 12,
    baseMonthlyPrice: 39900,
    discountPercentage: 10,
    benefits: [
      "Gym floor access",
      "Fitness orientation",
      "Group classes",
      "Quarterly progress review",
    ],
    allowPartialPayment: true,
    isPopular: false,
    isActive: true,
  },
];

const coupons = [
  {
    code: "DEVFIT10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minimumPurchaseAmount: 0,
  },
  {
    code: "DEVFIT200",
    discountType: "FLAT",
    discountValue: 20000,
    minimumPurchaseAmount: 0,
  },
].map((coupon) => ({
  ...coupon,
  expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  usageLimit: null,
  usageCount: 0,
  isActive: true,
}));

let connected = false;
try {
  await mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10000 });
  connected = true;

  const createdPlans = [];
  for (const planData of plans) {
    const existing = await Plan.exists({ name: planData.name });
    if (existing) continue;
    await Plan.create(planData);
    createdPlans.push(planData.name);
  }

  const createdCoupons = [];
  for (const couponData of coupons) {
    const existing = await Coupon.exists({ code: couponData.code });
    if (existing) continue;
    await Coupon.create(couponData);
    createdCoupons.push(couponData.code);
  }

  console.log(
    `Development seed complete in ${expectedDatabaseName}. Created ${createdPlans.length} plans and ${createdCoupons.length} coupons; existing records were left unchanged.`,
  );
  if (createdPlans.length) console.log(`Created plans: ${createdPlans.join(", ")}`);
  if (createdCoupons.length) console.log(`Created coupons: ${createdCoupons.join(", ")}`);
} finally {
  if (connected) await mongoose.disconnect();
}
