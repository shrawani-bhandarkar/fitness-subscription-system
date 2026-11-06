import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";

const staleModel = mongoose.model(
  "AdminAudit",
  new mongoose.Schema({
    action: { type: String, enum: ["PLAN_CREATED"] },
  }),
);
const { default: AdminAudit } = await import("../models/AdminAudit.js");

test("refreshes a cached AdminAudit schema that does not support plan archival", () => {
  assert.notEqual(AdminAudit, staleModel);
  assert.ok(AdminAudit.schema.path("action").enumValues.includes("PLAN_ARCHIVED"));
});
