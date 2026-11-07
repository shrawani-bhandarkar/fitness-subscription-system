"use server";

import mongoose from "mongoose";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminUser } from "@/features/auth/server";
import AdminAudit from "@/models/AdminAudit";
import Coupon from "@/models/Coupon";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import { isNonNegativePaise, isPositivePaise } from "@/lib/currency";
import { connectToDatabase } from "@/lib/db";
import { objectIdSchema, parseRupeesToPaise } from "@/features/shared/validation";
import { parseMemberProfile } from "@/features/member/profile-validation.mjs";
import { deletePlanRecord, savePlanRecord } from "@/features/admin/plan-management";
import { permanentlyDeleteMember } from "@/features/admin/member-deletion";

const planFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000),
  durationMonths: z.coerce.number().int().min(1).max(60),
  discountPercentage: z.coerce.number().min(0).max(99.99),
  benefits: z.array(z.string().trim().min(1).max(120)).max(20),
  isPopular: z.boolean(),
  allowPartialPayment: z.boolean(),
  isActive: z.boolean(),
});

function text(data, name) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function checked(data, name) {
  return data.get(name) === "on";
}

function reasonFrom(data, name = "reason") {
  return z.string().trim().min(4).max(500).safeParse(text(data, name));
}

function safeRedirect(path, result) {
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  revalidatePath("/billing");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/plans");
  revalidatePath("/admin/coupons");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/members");
  revalidatePath("/profile");
  redirect(`${path}?${result}`);
}

function planFormData(formData) {
  const price = parseRupeesToPaise(text(formData, "baseMonthlyPriceRupees"));
  const benefits = text(formData, "benefits")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const parsed = planFormSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    durationMonths: text(formData, "durationMonths"),
    discountPercentage: text(formData, "discountPercentage") || "0",
    benefits,
    isPopular: checked(formData, "isPopular"),
    allowPartialPayment: checked(formData, "allowPartialPayment"),
    isActive: checked(formData, "isActive"),
  });
  if (!parsed.success || !isPositivePaise(price)) {
    return null;
  }
  return { ...parsed.data, baseMonthlyPrice: price };
}

export async function savePlan(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "planId");
  const data = planFormData(formData);
  const reason = reasonFrom(formData, "changeReason");
  if (!data || !reason.success || (id && !objectIdSchema.safeParse(id).success)) {
    safeRedirect("/admin/plans", "error=INVALID_PLAN");
  }

  const savedPlanId = await savePlanRecord({
    adminUser: admin,
    planId: id || null,
    data,
    reason: reason.data,
  });
  safeRedirect(
    "/admin/plans",
    savedPlanId
      ? id
        ? "success=plan-updated"
        : "success=plan-created"
      : "error=PLAN_NOT_FOUND",
  );
}

export async function deletePlan(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "planId");
  const reason = reasonFrom(formData);
  if (!objectIdSchema.safeParse(id).success || !reason.success) {
    safeRedirect("/admin/plans", "error=INVALID_PLAN");
  }
  const result = await deletePlanRecord({
    adminUser: admin,
    planId: id,
    reason: reason.data,
    permanentlyDeleteReferencedPlan:
      formData.get("permanentlyDeleteReferencedPlan") === "on",
  });
  const outcome = {
    deleted: "success=plan-deleted",
    archived: "success=plan-archived",
    "not-found": "error=PLAN_NOT_FOUND",
  }[result];
  safeRedirect("/admin/plans", outcome);
}

const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Z0-9_-]+$/),
  discountType: z.enum(["FLAT", "PERCENTAGE"]),
  discountValue: z.number().positive(),
  expiryDate: z.date(),
  usageLimit: z.number().int().positive().nullable(),
  minimumPurchaseAmount: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

function couponFormData(formData) {
  const discountType = text(formData, "discountType");
  const parsedValue =
    discountType === "FLAT"
      ? parseRupeesToPaise(text(formData, "flatDiscountRupees"))
      : Number(text(formData, "percentageDiscount"));
  const expiryDate = new Date(text(formData, "expiryDate"));
  const usageText = text(formData, "usageLimit");
  const minimumPurchaseAmount = parseRupeesToPaise(
    text(formData, "minimumPurchaseRupees") || "0",
  );
  const usageLimit = usageText ? Number(usageText) : null;
  const parsed = couponSchema.safeParse({
    code: text(formData, "code").toUpperCase(),
    discountType,
    discountValue: parsedValue,
    expiryDate,
    usageLimit,
    minimumPurchaseAmount,
    isActive: checked(formData, "isActive"),
  });
  if (!parsed.success) {
    return null;
  }
  if (
    (discountType === "FLAT" && !isPositivePaise(parsedValue)) ||
    (discountType === "PERCENTAGE" && parsedValue > 99.99) ||
    !isNonNegativePaise(minimumPurchaseAmount) ||
    Number.isNaN(expiryDate.getTime())
  ) {
    return null;
  }
  return parsed.data;
}

export async function saveCoupon(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "couponId");
  const data = couponFormData(formData);
  const reason = reasonFrom(formData, "changeReason");
  if (!data || !reason.success || (id && !objectIdSchema.safeParse(id).success)) {
    safeRedirect("/admin/coupons", "error=INVALID_COUPON");
  }
  await connectToDatabase();
  const session = await mongoose.startSession();
  let saved = false;
  try {
    await session.withTransaction(async () => {
      if (!id) {
        const [coupon] = await Coupon.create([data], { session });
        await AdminAudit.create(
          [
            {
              adminUserId: admin._id,
              entityType: "COUPON",
              entityId: coupon._id,
              action: "COUPON_CREATED",
              reason: reason.data,
              after: { code: coupon.code, discountType: coupon.discountType },
            },
          ],
          { session },
        );
        saved = true;
        return;
      }

      const coupon = await Coupon.findById(id).session(session).exec();
      if (!coupon) return;
      const before = { code: coupon.code, isActive: coupon.isActive };
      Object.assign(coupon, data, { usageCount: coupon.usageCount });
      await coupon.save({ session });
      await AdminAudit.create(
        [
          {
            adminUserId: admin._id,
            entityType: "COUPON",
            entityId: coupon._id,
            action: "COUPON_UPDATED",
            reason: reason.data,
            before,
            after: { code: coupon.code, isActive: coupon.isActive },
          },
        ],
        { session },
      );
      saved = true;
    });
  } catch (error) {
    if (error?.code === 11000) {
      safeRedirect("/admin/coupons", "error=COUPON_CONFLICT");
    }
    throw error;
  } finally {
    await session.endSession();
  }
  safeRedirect(
    "/admin/coupons",
    saved ? (id ? "success=coupon-updated" : "success=coupon-created") : "error=COUPON_NOT_FOUND",
  );
}

export async function deleteCoupon(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "couponId");
  const reason = reasonFrom(formData);
  if (!objectIdSchema.safeParse(id).success || !reason.success) {
    safeRedirect("/admin/coupons", "error=INVALID_COUPON");
  }
  await connectToDatabase();
  const session = await mongoose.startSession();
  let deleted = false;
  try {
    await session.withTransaction(async () => {
      const coupon = await Coupon.findById(id).session(session).exec();
      if (!coupon) {
        return;
      }
      if (
        coupon.usageCount > 0 ||
        (await Subscription.exists({ couponCodeSnapshot: coupon.code })
          .session(session)
          .exec())
      ) {
        throw new Error("COUPON_IN_USE");
      }
      await Coupon.deleteOne({ _id: coupon._id }, { session }).exec();
      await AdminAudit.create(
        [
          {
            adminUserId: admin._id,
            entityType: "COUPON",
            entityId: coupon._id,
            action: "COUPON_DELETED",
            reason: reason.data,
            before: { code: coupon.code },
          },
        ],
        { session },
      );
      deleted = true;
    });
  } catch (error) {
    if (error.message === "COUPON_IN_USE") {
      safeRedirect("/admin/coupons", "error=COUPON_IN_USE");
    }
    throw error;
  } finally {
    await session.endSession();
  }
  safeRedirect("/admin/coupons", deleted ? "success=coupon-deleted" : "error=COUPON_NOT_FOUND");
}

export async function waiveSubscriptionBalance(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "subscriptionId");
  const reason = reasonFrom(formData);
  if (!objectIdSchema.safeParse(id).success || !reason.success) {
    safeRedirect("/admin/subscriptions", "error=INVALID_OVERRIDE");
  }

  await connectToDatabase();
  const session = await mongoose.startSession();
  let waived = false;
  try {
    await session.withTransaction(async () => {
      const subscription = await Subscription.findOne({
        _id: id,
        amountPaid: { $gt: 0 },
        remainingBalance: { $gt: 0 },
        status: "PARTIAL",
      })
        .session(session)
        .exec();
      if (!subscription) {
        return;
      }

      const previousBalance = subscription.remainingBalance;
      subscription.balanceWaivedPaise =
        (subscription.balanceWaivedPaise ?? 0) + previousBalance;
      subscription.balanceWaivedReason = reason.data;
      subscription.balanceWaivedBy = admin._id;
      subscription.balanceWaivedAt = new Date();
      subscription.remainingBalance = 0;
      subscription.nextPaymentDueDate = null;
      subscription.status =
        subscription.endDate <= new Date() ? "EXPIRED" : "ACTIVE";
      await subscription.save({ session });
      await AdminAudit.create(
        [
          {
            adminUserId: admin._id,
            entityType: "SUBSCRIPTION",
            entityId: subscription._id,
            action: "BALANCE_WAIVED",
            reason: reason.data,
            before: { remainingBalance: previousBalance },
            after: {
              remainingBalance: 0,
              balanceWaivedPaise: subscription.balanceWaivedPaise,
            },
          },
        ],
        { session },
      );
      waived = true;
    });
  } finally {
    await session.endSession();
  }
  safeRedirect("/admin/subscriptions", waived ? "success=balance-waived" : "error=NO_BALANCE");
}

export async function saveMemberProfile(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "memberId");
  const profile = parseMemberProfile({
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
  });
  const reason = reasonFrom(formData, "changeReason");

  if (
    !objectIdSchema.safeParse(id).success ||
    !profile ||
    !reason.success
  ) {
    safeRedirect("/admin/members", "error=INVALID_MEMBER");
  }

  await connectToDatabase();
  const session = await mongoose.startSession();
  let saved = false;
  try {
    await session.withTransaction(async () => {
      const member = await User.findOne({
        _id: id,
        role: { $in: ["MEMBER", "USER"] },
      })
        .session(session)
        .exec();
      if (!member) return;

      const before = {
        name: member.name,
        phone: member.phone ?? "",
        address: member.address ?? "",
      };
      Object.assign(member, profile);
      await member.save({ session });
      await AdminAudit.create(
        [
          {
            adminUserId: admin._id,
            entityType: "USER",
            entityId: member._id,
            action: "MEMBER_UPDATED",
            reason: reason.data,
            before,
            after: profile,
          },
        ],
        { session },
      );
      saved = true;
    });
  } finally {
    await session.endSession();
  }

  safeRedirect(
    `/admin/members/${id}`,
    saved ? "success=member-updated" : "error=MEMBER_NOT_FOUND",
  );
}

export async function deleteMemberPermanently(formData) {
  const admin = await requireAdminUser();
  const id = text(formData, "memberId");
  const confirmationEmail = text(formData, "confirmationEmail");
  if (!objectIdSchema.safeParse(id).success || !confirmationEmail) {
    redirect(`/admin/members/${encodeURIComponent(id)}?error=INVALID_MEMBER_DELETION`);
  }

  const result = await permanentlyDeleteMember({
    adminUser: admin,
    memberId: id,
    confirmationEmail,
    deleteClerkUser: async (clerkUserId) => {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUserId);
    },
  });
  if (result.status === "deleted") {
    revalidatePath("/admin/members");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/subscriptions");
    revalidatePath("/admin/transactions");
    redirect("/admin/members?success=member-deleted");
  }

  const errors = {
    forbidden: "ADMIN_REQUIRED",
    "not-found": "MEMBER_NOT_FOUND",
    "self-delete-prohibited": "MEMBER_SELF_DELETE",
    "last-admin-protected": "LAST_ADMIN_PROTECTED",
    "admin-protected": "ADMIN_ACCOUNT_PROTECTED",
    "email-mismatch": "MEMBER_EMAIL_CONFIRMATION_MISMATCH",
    "clerk-deletion-failed": "MEMBER_CLERK_DELETION_FAILED",
    "cleanup-failed": "MEMBER_CLEANUP_FAILED",
  };
  const error = errors[result.status] ?? "MEMBER_CLEANUP_FAILED";
  const destination =
    result.status === "not-found"
      ? "/admin/members"
      : `/admin/members/${encodeURIComponent(id)}`;
  redirect(`${destination}?error=${error}`);
}
