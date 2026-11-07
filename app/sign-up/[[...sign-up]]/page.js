import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      mode="sign-up"
      title="Start your journey"
      description="Create an account to keep your fitness membership in one place."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
