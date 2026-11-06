import { SignUp, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    return (
      <AuthShell
        mode="sign-up"
        title="Switch accounts to register"
        description="You are currently signed in. Sign out first, then create a new account with a separate email address."
      >
        <div className="flex justify-center rounded-xl border bg-white p-6">
          <UserButton afterSignOutUrl="/sign-up" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mode="sign-up"
      title="Start your journey"
      description="Create an account to keep your fitness membership in one place."
    >
      <Suspense
        fallback={
          <div className="rounded-xl border bg-white p-8 text-center">
            Loading registration form...
          </div>
        }
      >
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/auth/redirect"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full border-0 shadow-none",
            },
          }}
        />
      </Suspense>
    </AuthShell>
  );
}
