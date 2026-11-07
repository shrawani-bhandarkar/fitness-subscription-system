import "server-only";

import { connectToDatabase } from "../../lib/db.js";
import Subscription from "../../models/Subscription.js";
import { ensureThreeDayExpiryWarnings } from "../notifications/service.js";

export async function expireSubscriptions(now = new Date()) {
  await connectToDatabase();
  const result = await Subscription.updateMany(
    {
      status: { $in: ["PENDING", "PARTIAL", "ACTIVE"] },
      endDate: { $lte: now },
    },
    { $set: { status: "EXPIRED" } },
  ).exec();

  await ensureThreeDayExpiryWarnings(now);

  return result.modifiedCount;
}
