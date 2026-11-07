import { UserProfile } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";

export default async function AccountSettingsPage() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-[#f3f6f4] lg:flex">
      <MemberSidebar user={user} activePath="/account" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
          <p className="text-sm font-semibold text-emerald-700">YOUR ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Account settings</h1>
          <p className="mt-2 text-sm text-slate-500">Manage your sign-in email, password, and authentication profile through Clerk.</p>
          <div className="mt-7">
            <UserProfile routing="hash" />
          </div>
          <p className="mt-4 text-xs text-slate-500">Your updated primary email is synchronized to your membership profile on the next authenticated page request.</p>
        </div>
      </main>
    </div>
  );
}
