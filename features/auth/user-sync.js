import "server-only";

import { createHash } from "node:crypto";
import { connectToDatabase } from "../../lib/db.js";
import AdminAudit from "../../models/AdminAudit.js";
import User from "../../models/User.js";

function getProfileValue(profile, camelCase, snakeCase) {
  return profile[camelCase] ?? profile[snakeCase];
}

function getEmail(profile) {
  const emailAddresses = getProfileValue(
    profile,
    "emailAddresses",
    "email_addresses",
  );
  const primaryEmailAddressId = getProfileValue(
    profile,
    "primaryEmailAddressId",
    "primary_email_address_id",
  );
  if (!Array.isArray(emailAddresses)) {
    throw new Error("The Clerk user profile does not contain email addresses.");
  }
  const primaryEmail =
    emailAddresses.find((email) => email.id === primaryEmailAddressId) ??
    emailAddresses[0];

  const emailAddress = primaryEmail?.emailAddress ?? primaryEmail?.email_address;
  if (!emailAddress) {
    throw new Error("The Clerk user does not have a primary email address.");
  }

  return emailAddress.trim().toLowerCase();
}

function getName(profile, email) {
  const firstName = getProfileValue(profile, "firstName", "first_name");
  const lastName = getProfileValue(profile, "lastName", "last_name");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || profile.username || email;
}

function getRegistrationDate(profile) {
  const createdAt = getProfileValue(profile, "createdAt", "created_at");
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function syncClerkUser(
  profile,
  {
    adminClerkUserId = process.env.ADMIN_CLERK_USER_ID,
    updateName = false,
  } = {},
) {
  const clerkUserId = profile.id;
  if (typeof clerkUserId !== "string" || !clerkUserId) {
    throw new Error("The Clerk user profile is missing its user ID.");
  }

  const email = getEmail(profile);
  const name = getName(profile, email);
  const configuredAdminId = adminClerkUserId?.trim();
  const role =
    configuredAdminId && clerkUserId === configuredAdminId ? "ADMIN" : "MEMBER";
  const update = {
    $set: {
      email,
      role,
      ...(updateName ? { name } : {}),
    },
    $setOnInsert: {
      clerkUserId,
      name,
      registeredAt: getRegistrationDate(profile),
    },
  };
  const filter = { clerkUserId };

  await connectToDatabase();
  await User.init();
  const deletedAccountHash = createHash("sha256").update(clerkUserId).digest("hex");
  if (
    await AdminAudit.exists({
      action: "MEMBER_DELETED",
      clerkUserIdHash: deletedAccountHash,
    })
  ) {
    return null;
  }

  try {
    return await User.findOneAndUpdate(filter, update, {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    })
      .select("clerkUserId name email phone address role registeredAt createdAt")
      .lean()
      .exec();
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existingProfile = await User.findOneAndUpdate(filter, update, {
      returnDocument: "after",
      runValidators: true,
    })
      .select("clerkUserId name email phone address role registeredAt createdAt")
      .lean()
      .exec();

    if (!existingProfile) {
      throw error;
    }

    return existingProfile;
  }
}
