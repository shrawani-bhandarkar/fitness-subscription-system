"use client";

import { useState } from "react";
import { deleteMemberPermanently } from "@/features/admin/actions";

export function MemberDeletion({ member }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <section className="mt-8 border-t border-red-100 pt-6">
      <h2 className="text-lg font-semibold text-red-900">Permanent account deletion</h2>
      <p className="mt-1 text-sm text-slate-600">
        This permanently removes the member profile and Clerk account. Financial
        history is retained with personal identifiers removed.
      </p>
      {!isConfirming ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="mt-4 min-h-10 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50"
        >
          Permanently Delete Member
        </button>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-delete-title"
          className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 sm:p-5"
        >
          <h3 id="member-delete-title" className="font-semibold text-red-950">
            Confirm permanent deletion
          </h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-red-800">Member</dt>
              <dd className="font-medium text-slate-950">{member.name}</dd>
            </div>
            <div>
              <dt className="text-red-800">Email</dt>
              <dd className="font-medium text-slate-950">{member.email}</dd>
            </div>
            <div>
              <dt className="text-red-800">Member ID</dt>
              <dd className="break-all font-mono text-xs text-slate-950">{member._id}</dd>
            </div>
          </dl>
          <form action={deleteMemberPermanently} className="mt-4">
            <input type="hidden" name="memberId" value={member._id} />
            <label className="block text-sm font-medium text-slate-800">
              Enter the member&apos;s email to confirm
              <input
                type="email"
                name="confirmationEmail"
                autoComplete="off"
                required
                className="mt-1.5 min-h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-sm"
              />
            </label>
            <p className="mt-2 text-xs text-red-800">
              This action cannot be undone. The member&apos;s Clerk sign-in and
              profile will be permanently deleted.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
              >
                Permanently Delete Member
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
