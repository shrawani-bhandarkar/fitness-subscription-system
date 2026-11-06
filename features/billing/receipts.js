import "server-only";

import mongoose from "mongoose";
import { isAdministratorRole, isMemberRole } from "../auth/authorization.mjs";
import { connectToDatabase } from "../../lib/db.js";
import Payment from "../../models/Payment.js";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { canAccessPaymentReceipt } from "./receipt-access.mjs";

export async function getPaymentReceiptDetails(paymentId, currentUser) {
  if (!mongoose.isValidObjectId(paymentId)) {
    return null;
  }
  const isAdmin = isAdministratorRole(currentUser?.role);
  if (!isAdmin && !isMemberRole(currentUser?.role)) {
    return { status: "forbidden" };
  }

  await connectToDatabase();
  const payment = await Payment.findById(paymentId).lean().exec();
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
    Subscription.findOne({
      _id: payment.subscriptionId,
      ...(payment.userId
        ? { userId: payment.userId }
        : {
            memberReference: payment.memberReference,
            memberDeletedAt: { $ne: null },
          }),
    })
      .lean()
      .exec(),
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
