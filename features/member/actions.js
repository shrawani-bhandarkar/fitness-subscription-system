"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/server";
import { parseMemberProfile } from "@/features/member/profile-validation.mjs";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function updateMemberProfile(formData) {
  const user = await requireCurrentUser();
  const profile = parseMemberProfile({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
  });

  if (!profile) {
    redirect("/profile?error=INVALID_PROFILE");
  }

  await connectToDatabase();
  const result = await User.updateOne(
    { _id: user._id, clerkUserId: user.clerkUserId },
    { $set: profile },
    { runValidators: true },
  ).exec();

  if (result.matchedCount !== 1) {
    throw new Error("The member profile could not be found.");
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin/members");
  redirect("/profile?updated=1");
}
