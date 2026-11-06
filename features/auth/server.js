import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { syncClerkUser } from "./user-sync";
import { isAdministratorRole, isMemberRole } from "./authorization.mjs";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("Administrator access is required.");
    this.name = "AuthorizationError";
  }
}

export class MemberAuthorizationError extends Error {
  constructor(redirectPath) {
    super("Member access is required.");
    this.name = "MemberAuthorizationError";
    this.redirectPath = redirectPath;
  }
}

export async function requireCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new AuthenticationRequiredError();
  }

  const clerkUser = await currentUser();

  if (!clerkUser || clerkUser.id !== userId) {
    throw new AuthenticationRequiredError();
  }

  const user = await syncClerkUser(clerkUser);
  if (!user) {
    throw new AuthenticationRequiredError();
  }
  return user;
}

export async function requireMemberUser() {
  const user = await requireCurrentUser();

  if (!isMemberRole(user.role)) {
    throw new MemberAuthorizationError(
      isAdministratorRole(user.role) ? "/admin/dashboard" : "/dashboard",
    );
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!isAdministratorRole(user.role)) {
    throw new AuthorizationError();
  }

  return user;
}
