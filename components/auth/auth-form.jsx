"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { Suspense } from "react";

export function AuthForm({ mode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border bg-white p-8 text-center text-sm text-slate-600"
      >
        Checking your authentication status...
      </div>
    );
  }

  const Form = mode === "sign-in" ? SignIn : SignUp;

  return (
    <div className="relative">
      {isSignedIn && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-10 grid place-items-center rounded-xl border bg-white p-8 text-center text-sm text-slate-600 shadow-sm"
        >
          Authentication successful. Redirecting to your dashboard...
        </div>
      )}
      <div className={isSignedIn ? "invisible" : ""} aria-hidden={isSignedIn}>
        <Suspense
          fallback={
            <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-600">
              Loading authentication form...
            </div>
          }
        >
          <Form
            routing="path"
            path={`/${mode}`}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            withSignUp={mode === "sign-in" ? false : undefined}
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
      </div>
    </div>
  );
}
