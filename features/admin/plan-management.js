import "server-only";

import mongoose from "mongoose";
import { connectToDatabase } from "../../lib/db.js";
import AdminAudit from "../../models/AdminAudit.js";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import { isAdministratorRole } from "../auth/authorization.mjs";

function assertAdministrator(adminUser) {
  if (!isAdministratorRole(adminUser?.role)) {
    throw new Error("Administrator access is required to manage plans.");
  }
}

export async function savePlanRecord({ adminUser, planId, data, reason }) {
  assertAdministrator(adminUser);
  await connectToDatabase();
  const session = await mongoose.startSession();
  let savedPlanId = null;

  try {
    await session.withTransaction(async () => {
      if (!planId) {
        const [plan] = await Plan.create([data], { session });
        await AdminAudit.create(
          [
            {
              adminUserId: adminUser._id,
              entityType: "PLAN",
              entityId: plan._id,
              action: "PLAN_CREATED",
              reason,
              after: { name: plan.name, baseMonthlyPrice: plan.baseMonthlyPrice },
            },
          ],
          { session },
        );
        savedPlanId = plan._id;
        return;
      }

      const plan = await Plan.findById(planId).session(session).exec();
      if (!plan) return;

      const before = {
        name: plan.name,
        baseMonthlyPrice: plan.baseMonthlyPrice,
        isActive: plan.isActive,
      };
      Object.assign(plan, data);
      await plan.save({ session });
      await AdminAudit.create(
        [
          {
            adminUserId: adminUser._id,
            entityType: "PLAN",
            entityId: plan._id,
            action: "PLAN_UPDATED",
            reason,
            before,
            after: {
              name: plan.name,
              baseMonthlyPrice: plan.baseMonthlyPrice,
              isActive: plan.isActive,
            },
          },
        ],
        { session },
      );
      savedPlanId = plan._id;
    });
  } finally {
    await session.endSession();
  }

  return savedPlanId;
}

export async function deletePlanRecord({ adminUser, planId, reason }) {
  assertAdministrator(adminUser);
  await connectToDatabase();
  const session = await mongoose.startSession();
  let result = "not-found";

  try {
    await session.withTransaction(async () => {
      const plan = await Plan.findById(planId).session(session).exec();
      if (!plan) return;

      const before = {
        name: plan.name,
        isActive: plan.isActive,
      };
      const hasSubscriptions = await Subscription.exists({ planId })
        .session(session)
        .exec();

      if (hasSubscriptions) {
        plan.isActive = false;
        await plan.save({ session });
        await AdminAudit.create(
          [
            {
              adminUserId: adminUser._id,
              entityType: "PLAN",
              entityId: plan._id,
              action: "PLAN_ARCHIVED",
              reason,
              before,
              after: { name: plan.name, isActive: false },
            },
          ],
          { session },
        );
        result = "archived";
        return;
      }

      await Plan.deleteOne({ _id: plan._id }, { session }).exec();
      await AdminAudit.create(
        [
          {
            adminUserId: adminUser._id,
            entityType: "PLAN",
            entityId: plan._id,
            action: "PLAN_DELETED",
            reason,
            before: { name: plan.name },
          },
        ],
        { session },
      );
      result = "deleted";
    });
  } finally {
    await session.endSession();
  }

  return result;
}
