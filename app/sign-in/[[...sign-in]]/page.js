import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      mode="sign-in"
      title="Welcome back"
      description="Log in to continue managing your fitness membership."
    >
      <AuthForm mode="sign-in" />
    </AuthShell>
  );
}
