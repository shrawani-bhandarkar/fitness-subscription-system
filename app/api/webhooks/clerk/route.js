import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import { syncClerkUser } from "@/features/auth/user-sync";
import { synchronizeClerkUserDeletion } from "@/features/admin/member-deletion";

export const runtime = "nodejs";

export async function POST(request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: "Clerk webhook signing secret is not configured." },
      { status: 503 },
    );
  }

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      await syncClerkUser(event.data, { updateName: true });
    } else if (event.type === "user.deleted") {
      if (typeof event.data.id !== "string" || !event.data.id) {
        return NextResponse.json(
          { error: "Deleted user event is missing its user ID." },
          { status: 400 },
        );
      }
      await synchronizeClerkUserDeletion(event.data.id);
    }
  } catch (error) {
    console.error("Clerk webhook synchronization failed.", error);
    return NextResponse.json(
      { error: "Unable to synchronize the Clerk user." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
