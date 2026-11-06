import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

const staleUserModel = mongoose.model(
  "User",
  new mongoose.Schema({
    role: { type: String, enum: ["ADMIN", "USER"], default: "USER" },
  }),
);
const { default: User } = await import("../models/User.js");

test("replaces a stale cached User schema with the current role enum", () => {
  assert.notEqual(User, staleUserModel);
  assert.deepEqual(User.schema.path("role").enumValues, ["ADMIN", "MEMBER", "USER"]);
  assert.equal(User.schema.path("role").defaultValue, "MEMBER");
});

test("new users default to MEMBER", async () => {
  const user = new User({
    clerkUserId: "clerk_new_member",
    name: "New Member",
    email: "member@example.test",
  });

  assert.equal(user.role, "MEMBER");
  await assert.doesNotReject(user.validate());
});

test("User schema accepts ADMIN, MEMBER, and legacy USER roles", async () => {
  for (const role of ["ADMIN", "MEMBER", "USER"]) {
    const user = new User({
      clerkUserId: `clerk_${role.toLowerCase()}`,
      name: `${role} Account`,
      email: `${role.toLowerCase()}@example.test`,
      role,
    });

    await assert.doesNotReject(user.validate(), `${role} should be valid`);
  }
});

test("User schema rejects roles outside the supported enum", async () => {
  const user = new User({
    clerkUserId: "clerk_invalid_role",
    name: "Invalid Role",
    email: "invalid@example.test",
    role: "admin",
  });

  await assert.rejects(user.validate(), (error) => {
    assert.match(error.errors.role?.message ?? "", /not a valid enum value/);
    return true;
  });
});
