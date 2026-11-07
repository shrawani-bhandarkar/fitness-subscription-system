import { redirect } from "next/navigation";
import { MemberSidebar } from "@/components/dashboard/member-sidebar";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { formatDate } from "@/features/member/presentation";
import { getMemberProfileData } from "@/features/member/data";
import { getSubscriptionStatus } from "@/features/member/presentation";
import { updateMemberProfile } from "@/features/member/actions";

export default async function ProfilePage({ searchParams }) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    throw error;
  }

  const query = await searchParams;
  const invalid = query?.error === "INVALID_PROFILE";
  const { subscription, subscriptionCount } = await getMemberProfileData(user._id);
  const membershipStatus = getSubscriptionStatus(subscription);

  return (
    <div className="min-h-screen bg-[#f3f6f4] lg:flex">
      <MemberSidebar user={user} activePath="/profile" />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-10">
          <p className="text-sm font-semibold text-emerald-700">YOUR ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Update your member contact details. Your sign-in email is managed by
            Clerk.
          </p>

          {query?.updated === "1" && (
            <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Profile changes saved.
            </p>
          )}
          {invalid && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              Enter a name of 2–80 characters, a valid phone number, and an
              address of at most 500 characters.
            </p>
          )}

          <form action={updateMemberProfile} className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={user.name}
                autoComplete="name"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email address
              <input
                value={user.email}
                readOnly
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input
                name="phone"
                type="tel"
                maxLength={32}
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Address
              <textarea
                name="address"
                maxLength={500}
                rows={3}
                defaultValue={user.address ?? ""}
                autoComplete="street-address"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-800">Member since:</span>{" "}
                {formatDate(user.registeredAt ?? user.createdAt)}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-800">Account type:</span>{" "}
                {user.role === "ADMIN" ? "Administrator" : "Member"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-800">Membership:</span>{" "}
                {membershipStatus
                  ? `${membershipStatus} · ${subscription.planNameSnapshot}`
                  : "No membership"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-800">Subscriptions:</span>{" "}
                {subscriptionCount}
              </p>
            </div>
            <button className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800">
              Save profile
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
