import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthenticatedHomePath,
  isAdministratorRole,
  isMemberRole,
} from "../features/auth/authorization.mjs";

test("sign-in redirects the configured administrator to the admin dashboard", () => {
  assert.equal(getAuthenticatedHomePath("clerk_admin", " clerk_admin "), "/admin/dashboard");
});

test("sign-in redirects other users to the member dashboard", () => {
  assert.equal(getAuthenticatedHomePath("clerk_member", "clerk_admin"), "/dashboard");
  assert.equal(getAuthenticatedHomePath("clerk_admin", ""), "/dashboard");
});

test("only the configured Clerk user ID receives the administrator redirect", () => {
  assert.equal(getAuthenticatedHomePath("clerk_admin", "clerk_admin"), "/admin/dashboard");
  assert.equal(getAuthenticatedHomePath("clerk_member", "clerk_admin"), "/dashboard");
  assert.equal(getAuthenticatedHomePath("clerk_member", ""), "/dashboard");
});

test("member roles include new and legacy member records but exclude administrators", () => {
  assert.equal(isAdministratorRole("ADMIN"), true);
  assert.equal(isAdministratorRole("MEMBER"), false);
  assert.equal(isMemberRole("MEMBER"), true);
  assert.equal(isMemberRole("USER"), true);
  assert.equal(isMemberRole("ADMIN"), false);
});
