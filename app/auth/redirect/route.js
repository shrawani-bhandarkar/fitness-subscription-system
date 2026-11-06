import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/features/auth/server";
import { getAuthenticatedHomePath } from "@/features/auth/authorization.mjs";

export async function GET(request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  await requireCurrentUser();
  const destination = getAuthenticatedHomePath(
    userId,
    process.env.ADMIN_CLERK_USER_ID,
  );

  return NextResponse.redirect(new URL(destination, request.url));
}
