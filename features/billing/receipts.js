import "server-only";

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { isAdministratorRole, isMemberRole } from "../auth/authorization.mjs";
import { connectToDatabase } from "../../lib/db.js";
import Payment from "../../models/Payment.js";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { canAccessPaymentReceipt } from "./receipt-access.mjs";
import { ensureSuccessfulPaymentReceipt } from "./service.js";

function makeDocumentNumber(prefix) {
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

async function ensureSubscriptionInvoiceRecord(subscriptionId, payment) {
  if (!subscriptionId) {
    return null;
  }

  const subscription = await Subscription.findById(subscriptionId).select("invoiceNumber invoiceIssuedAt").lean().exec();
  if (!subscription) {
    return null;
  }

  if (subscription.invoiceNumber && subscription.invoiceIssuedAt) {
    return subscription;
  }

  const invoiceNumber = subscription.invoiceNumber ?? makeDocumentNumber("INV");
  const invoiceIssuedAt = subscription.invoiceIssuedAt ?? payment.paymentDate ?? payment.createdAt ?? new Date();

  const updated = await Subscription.findOneAndUpdate(
    { _id: subscriptionId, $or: [{ invoiceNumber: { $exists: false } }, { invoiceNumber: null }, { invoiceIssuedAt: { $exists: false } }, { invoiceIssuedAt: null }] },
    { $set: { invoiceNumber, invoiceIssuedAt } },
    { new: true, runValidators: true },
  ).lean().exec();

  return updated ?? { ...subscription, invoiceNumber, invoiceIssuedAt };
}

export async function getPaymentReceiptDetails(paymentId, currentUser) {
  if (!mongoose.isValidObjectId(paymentId)) {
    return null;
  }
  const isAdmin = isAdministratorRole(currentUser?.role);
  if (!isAdmin && !isMemberRole(currentUser?.role)) {
    return { status: "forbidden" };
  }

  await connectToDatabase();
  let payment = await Payment.findById(paymentId).lean().exec();
  if (payment?.paymentStatus === "SUCCEEDED" && !payment.receiptNumber) {
    payment = await ensureSuccessfulPaymentReceipt(payment._id);
  }
  if (
    !canAccessPaymentReceipt({
      payment,
      currentUserId: currentUser._id,
      isAdmin,
    })
  ) {
    return null;
  }

  const [member, subscription] = await Promise.all([
    payment.userId
      ? User.findById(payment.userId).select("name email").lean().exec()
      : Promise.resolve(
          isAdmin && payment.memberDeletedAt
            ? {
                name: "Deleted member",
                email: "Not retained (permanent deletion)",
              }
            : null,
        ),
    (async () => {
      const subscriptionRecord = await Subscription.findOne({
        _id: payment.subscriptionId,
        ...(payment.userId
          ? { userId: payment.userId }
          : {
              memberReference: payment.memberReference,
              memberDeletedAt: { $ne: null },
            }),
      })
        .lean()
        .exec();

      if (!subscriptionRecord) {
        return null;
      }

      if (!subscriptionRecord.invoiceNumber || !subscriptionRecord.invoiceIssuedAt) {
        return ensureSubscriptionInvoiceRecord(subscriptionRecord._id, payment);
      }

      return subscriptionRecord;
    })(),
  ]);
  if (!member || !subscription) {
    return null;
  }

  return {
    status: "ok",
    payment,
    subscription,
    member: {
      name: payment.memberSnapshot?.name ?? member.name,
      email: payment.memberSnapshot?.email ?? member.email,
      memberId:
        payment.memberSnapshot?.memberId ??
        payment.userId?.toString() ??
        payment.memberReference,
    },
  };
}
