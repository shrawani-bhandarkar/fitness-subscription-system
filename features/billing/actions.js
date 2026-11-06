"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AuthenticationRequiredError,
  MemberAuthorizationError,
  requireMemberUser,
} from "@/features/auth/server";
import {
  createDemoBalancePayment,
  createDemoEnrollment,
} from "@/features/billing/service";
import { parseRupeesToPaise } from "@/features/shared/validation";

const paymentMethodSchema = z.enum(["UPI", "CARD", "NET_BANKING"]);
const keySchema = z.string().uuid();

function requiredText(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function authenticatedMember() {
  try {
    return await requireMemberUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    if (error instanceof MemberAuthorizationError) {
      redirect(`${error.redirectPath}?error=MEMBER_REQUIRED`);
    }

    throw error;
  }
}

export async function processDemoCheckout(formData) {
  const user = await authenticatedMember();
  const planId = requiredText(formData, "planId");
  const paymentType = requiredText(formData, "paymentType");
  const amountText = requiredText(formData, "partialAmount");
  const quoteTotalPaiseText = requiredText(formData, "quoteTotalPaise");
  const couponCode = requiredText(formData, "couponCode").toUpperCase();
  const paymentMethod = paymentMethodSchema.safeParse(
    requiredText(formData, "paymentMethod"),
  );
  const idempotencyKey = keySchema.safeParse(
    requiredText(formData, "idempotencyKey"),
  );

  if (
    !/^[a-f\d]{24}$/i.test(planId) ||
    !["FULL", "PARTIAL"].includes(paymentType) ||
    !paymentMethod.success ||
    !idempotencyKey.success ||
    couponCode.length > 32
  ) {
    redirect("/plans?error=INVALID_INPUT");
  }

  const amount = paymentType === "PARTIAL" ? parseRupeesToPaise(amountText) : 0;
  const quoteTotalPaise = /^\d+$/.test(quoteTotalPaiseText)
    ? Number(quoteTotalPaiseText)
    : null;
  if (paymentType === "PARTIAL" && !amount) {
    redirect(`/plans/${planId}/checkout?error=INVALID_AMOUNT`);
  }
  if (!Number.isSafeInteger(quoteTotalPaise) || quoteTotalPaise <= 0) {
    redirect(`/plans/${planId}/checkout?error=QUOTE_CHANGED`);
  }

  try {
    await createDemoEnrollment({
      userId: user._id,
      planId,
      paymentType,
      amount,
      paymentMethod: paymentMethod.data,
      couponCode,
      idempotencyKey: idempotencyKey.data,
      quoteTotalPaise,
    });
  } catch (error) {
    if (error?.code === 11000) {
      redirect(`/plans/${planId}/checkout?error=PAYMENT_RETRY`);
    }
    if (
      error?.message?.includes("Transaction numbers are only allowed") ||
      error?.message?.includes("replica set")
    ) {
      throw new Error(
        "Demo checkout requires MongoDB transactions. Use a replica-set deployment such as MongoDB Atlas.",
        { cause: error },
      );
    }
    const knownMessages = new Map([
      ["The selected plan is unavailable.", "PLAN_UNAVAILABLE"],
      ["This coupon is not valid for the selected purchase.", "COUPON_INVALID"],
      ["This coupon has reached its usage limit.", "COUPON_LIMIT"],
      ["The payment amount is not allowed for this plan.", "INVALID_AMOUNT"],
      ["The selected plan must have a positive payable amount.", "INVALID_PLAN_PRICE"],
      ["The selected plan has an invalid payable price.", "INVALID_PLAN_PRICE"],
      ["The checkout price changed. Review the updated total before confirming.", "QUOTE_CHANGED"],
      ["This payment request key has already been used for a different request.", "IDEMPOTENCY_CONFLICT"],
    ]);
    const errorCode = knownMessages.get(error.message);
    if (!errorCode) {
      throw error;
    }
    redirect(`/plans/${planId}/checkout?error=${errorCode}`);
  }

  redirect("/billing?payment=demo-success");
}

export async function processDemoBalancePayment(formData) {
  const user = await authenticatedMember();
  const subscriptionId = requiredText(formData, "subscriptionId");
  const amount = parseRupeesToPaise(requiredText(formData, "amount"));
  const paymentMethod = paymentMethodSchema.safeParse(
    requiredText(formData, "paymentMethod"),
  );
  const idempotencyKey = keySchema.safeParse(
    requiredText(formData, "idempotencyKey"),
  );

  if (
    !/^[a-f\d]{24}$/i.test(subscriptionId) ||
    !amount ||
    !paymentMethod.success ||
    !idempotencyKey.success
  ) {
    redirect("/billing?error=INVALID_PAYMENT");
  }

  try {
    await createDemoBalancePayment({
      userId: user._id,
      subscriptionId,
      amount,
      paymentMethod: paymentMethod.data,
      idempotencyKey: idempotencyKey.data,
    });
  } catch (error) {
    if (
      error?.message?.includes("Transaction numbers are only allowed") ||
      error?.message?.includes("replica set")
    ) {
      throw new Error(
        "Demo checkout requires MongoDB transactions. Use a replica-set deployment such as MongoDB Atlas.",
        { cause: error },
      );
    }
    if (error?.message === "No outstanding balance is available for payment." ||
        error?.message === "The payment must be within the outstanding balance.") {
      redirect("/billing?error=PAYMENT_REJECTED");
    }
    if (error?.code === 11000) {
      redirect("/billing?payment=already-processed");
    }
    if (error?.message === "This payment request key has already been used for a different request.") {
      redirect("/billing?error=IDEMPOTENCY_CONFLICT");
    }
    throw new Error("The demo payment could not be completed. Verify the amount and try again.", { cause: error });
  }

  redirect("/billing?payment=demo-success");
}
