import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      mode="sign-in"
      title="Welcome back"
      description="Log in to continue managing your fitness membership."
    >
      <Suspense
        fallback={
          <div className="rounded-xl border bg-white p-8 text-center">
            Loading sign-in form...
          </div>
        }
      >
        <SignIn
          routing="path"
          path="/sign-in"
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          withSignUp={false}
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
