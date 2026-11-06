import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthenticatedHomePath } from "./features/auth/authorization.mjs";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/billing(.*)",
  "/admin(.*)",
]);
const isSignInRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
      return;
    }

    if (isSignInRoute(request)) {
      const { userId } = await auth();

      if (userId) {
        const destination = getAuthenticatedHomePath(
          userId,
          process.env.ADMIN_CLERK_USER_ID,
        );
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
  },
  {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
