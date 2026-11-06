import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { isAdministratorRole, isMemberRole } from "../auth/authorization.mjs";
import { connectToDatabase } from "../../lib/db.js";
import AdminAudit from "../../models/AdminAudit.js";
import Payment from "../../models/Payment.js";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";

const DELETION_AUDIT_REASON = "Member permanently deleted; personal profile data erased.";

function clerkUserIdHash(clerkUserId) {
  return createHash("sha256").update(clerkUserId).digest("hex");
}

function isClerkUserNotFound(error) {
  return error?.status === 404 || error?.statusCode === 404;
}

async function markDeletionFailed(auditId, { clerkAccountDeleted, reason }) {
  const updated = await AdminAudit.updateOne(
    {
      _id: auditId,
      action: { $in: ["MEMBER_DELETION_PENDING", "MEMBER_DELETION_FAILED"] },
    },
    {
      $set: {
        action: "MEMBER_DELETION_FAILED",
        reason,
        after: {
          outcome: "FAILED",
          clerkAccountDeleted,
          mongoProfileDeleted: false,
        },
      },
    },
  ).exec();
  return updated.modifiedCount === 1;
}

async function hasCompletedDeletion(memberId) {
  return Boolean(
    await AdminAudit.exists({
      entityType: "USER",
      entityId: memberId,
      action: "MEMBER_DELETED",
    }),
  );
}

export async function permanentlyDeleteMember({
  adminUser,
  memberId,
  confirmationEmail,
  deleteClerkUser,
  finalizeDeletion = finalizeMemberDeletion,
}) {
  if (!isAdministratorRole(adminUser?.role)) {
    return { status: "forbidden" };
  }
  if (!mongoose.isValidObjectId(memberId)) {
    return { status: "not-found" };
  }

  await connectToDatabase();
  const member = await User.findById(memberId).exec();
  if (!member) {
    const completed = await AdminAudit.exists({
      entityType: "USER",
      entityId: memberId,
      action: "MEMBER_DELETED",
    });
    return { status: completed ? "deleted" : "not-found" };
  }

  if (String(member._id) === String(adminUser._id) ||
      member.clerkUserId === adminUser.clerkUserId) {
    return { status: "self-delete-prohibited" };
  }
  if (!isMemberRole(member.role)) {
    const adminCount = await User.countDocuments({ role: "ADMIN" });
    return { status: adminCount <= 1 ? "last-admin-protected" : "admin-protected" };
  }
  if (
    typeof confirmationEmail !== "string" ||
    confirmationEmail.trim().toLowerCase() !== member.email.toLowerCase()
  ) {
    return { status: "email-mismatch" };
  }
  if (typeof deleteClerkUser !== "function") {
    throw new TypeError("A server-side Clerk deletion function is required.");
  }

  const pendingAudit = await AdminAudit.create({
    adminUserId: adminUser._id,
    entityType: "USER",
    entityId: member._id,
    action: "MEMBER_DELETION_PENDING",
    reason: "Administrator requested permanent member deletion.",
    after: { outcome: "PENDING" },
  });

  let clerkAccountDeleted = false;
  try {
    await deleteClerkUser(member.clerkUserId);
    clerkAccountDeleted = true;
  } catch (error) {
    if (isClerkUserNotFound(error)) {
      clerkAccountDeleted = true;
    } else {
      const markedFailed = await markDeletionFailed(pendingAudit._id, {
        clerkAccountDeleted: false,
        reason: "Clerk account deletion failed; member records were retained.",
      });
      if (!markedFailed && await hasCompletedDeletion(member._id)) {
        return { status: "deleted" };
      }
      return { status: "clerk-deletion-failed" };
    }
  }

  try {
    const result = await finalizeDeletion({
      memberId: member._id,
      clerkUserId: member.clerkUserId,
      adminUserId: adminUser._id,
      pendingAuditId: pendingAudit._id,
      source: "ADMIN",
    });
    return result.status === "deleted" || result.status === "already-deleted"
      ? { status: "deleted" }
      : { status: "cleanup-failed" };
  } catch {
    const markedFailed = await markDeletionFailed(pendingAudit._id, {
      clerkAccountDeleted,
      reason: "Clerk account is deleted; MongoDB cleanup failed and must be retried.",
    });
    if (!markedFailed && await hasCompletedDeletion(member._id)) {
      return { status: "deleted" };
    }
    return { status: "cleanup-failed" };
  }
}

async function finalizeMemberDeletion({
  memberId,
  clerkUserId,
  adminUserId = null,
  pendingAuditId = null,
  source,
}) {
  const accountHash = clerkUserIdHash(clerkUserId);
  const session = await mongoose.startSession();
  let result = { status: "not-found" };
  try {
    await session.withTransaction(async () => {
      const member = await User.findById(memberId).session(session).exec();
      if (!member) {
        const completed = await AdminAudit.exists({
          entityType: "USER",
          entityId: memberId,
          action: "MEMBER_DELETED",
          clerkUserIdHash: accountHash,
        }).session(session);
        result = { status: completed ? "already-deleted" : "not-found" };
        return;
      }
      if (member.clerkUserId !== clerkUserId) {
        throw new Error("Member account identity changed during deletion.");
      }

      let audit = pendingAuditId
        ? await AdminAudit.findOne({
            _id: pendingAuditId,
            entityType: "USER",
            entityId: member._id,
            action: { $in: ["MEMBER_DELETION_PENDING", "MEMBER_DELETION_FAILED"] },
          })
            .session(session)
            .exec()
        : await AdminAudit.findOne({
            entityType: "USER",
            entityId: member._id,
            action: { $in: ["MEMBER_DELETION_PENDING", "MEMBER_DELETION_FAILED"] },
          })
            .sort({ createdAt: -1 })
            .session(session)
            .exec();
      const memberReference = `ANON-${randomUUID().toUpperCase()}`;
      const deletedAt = new Date();
      const subscriptionResult = await Subscription.updateMany(
        { userId: member._id },
        { $set: { userId: null, memberReference, memberDeletedAt: deletedAt } },
        { session },
      ).exec();
      const paymentResult = await Payment.updateMany(
        { userId: member._id },
        {
          $set: {
            userId: null,
            memberReference,
            memberDeletedAt: deletedAt,
            "memberSnapshot.memberId": memberReference,
            "memberSnapshot.name": "Deleted member",
            "memberSnapshot.email": null,
          },
        },
        { session },
      ).exec();

      await AdminAudit.updateMany(
        {
          entityType: "USER",
          entityId: member._id,
          action: "MEMBER_UPDATED",
        },
        {
          $set: {
            reason: "Member personal data erased as part of permanent deletion.",
            before: null,
            after: null,
          },
        },
        { session },
      ).exec();

      const deletedProfile = await User.deleteOne(
        { _id: member._id, clerkUserId },
        { session },
      ).exec();
      if (deletedProfile.deletedCount !== 1) {
        throw new Error("Member profile could not be deleted.");
      }

      const auditOutcome = {
        outcome: "COMPLETE",
        source,
        clerkAccountDeleted: true,
        mongoProfileDeleted: true,
        personalDataErased: true,
        subscriptionsAnonymized: subscriptionResult.modifiedCount,
        paymentsAnonymized: paymentResult.modifiedCount,
      };
      if (audit) {
        audit.action = "MEMBER_DELETED";
        audit.reason = DELETION_AUDIT_REASON;
        audit.after = auditOutcome;
        audit.clerkUserIdHash = accountHash;
        await audit.save({ session });
      } else {
        await AdminAudit.create(
          [
            {
              adminUserId,
              entityType: "USER",
              entityId: member._id,
              action: "MEMBER_DELETED",
              reason: DELETION_AUDIT_REASON,
              after: auditOutcome,
              clerkUserIdHash: accountHash,
            },
          ],
          { session },
        );
      }
      result = {
        status: "deleted",
        subscriptionsAnonymized: subscriptionResult.modifiedCount,
        paymentsAnonymized: paymentResult.modifiedCount,
      };
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function synchronizeClerkUserDeletion(clerkUserId) {
  if (typeof clerkUserId !== "string" || !clerkUserId) {
    throw new TypeError("The deleted Clerk user ID is required.");
  }
  await connectToDatabase();
  const member = await User.findOne({ clerkUserId }).select("_id").lean().exec();
  if (!member) {
    return { status: "already-deleted" };
  }
  return finalizeMemberDeletion({
    memberId: member._id,
    clerkUserId,
    source: "CLERK_WEBHOOK",
  });
}

export { clerkUserIdHash };
