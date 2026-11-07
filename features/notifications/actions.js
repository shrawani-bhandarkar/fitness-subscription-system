"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "../auth/server.js";
import Notification from "../../models/Notification.js";

export async function markNotificationsRead(formData) {
  const user = await requireCurrentUser();
  const rawIds = formData.getAll("notificationId").map((value) => String(value).trim());
  const notificationIds = rawIds.filter((id) => /^[a-f\d]{24}$/i.test(id)).map((id) => new mongoose.Types.ObjectId(id));

  if (notificationIds.length === 0) {
    return;
  }

  await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      userId: user._id,
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  ).exec();

  revalidatePath("/dashboard");
  revalidatePath("/billing");
  revalidatePath("/subscriptions");
  revalidatePath("/profile");
  revalidatePath("/account");
}
