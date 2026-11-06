import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import { toMemberEditorDto } from "../features/admin/member-editor-dto.mjs";

test("member editor DTO contains only serializable editable member fields", () => {
  const member = {
    _id: new mongoose.Types.ObjectId(),
    name: "Test Member",
    email: "member@example.test",
    phone: null,
    address: undefined,
    registeredAt: new Date("2025-01-02T03:04:05.000Z"),
    nested: { _id: new mongoose.Types.ObjectId() },
  };

  const dto = toMemberEditorDto(member);

  assert.deepEqual(dto, {
    _id: member._id.toString(),
    name: "Test Member",
    phone: "",
    address: "",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), dto);
  assert.equal(Object.getPrototypeOf(dto), Object.prototype);
});

test("member editor DTO rejects missing required member values", () => {
  assert.throws(() => toMemberEditorDto(null), /missing its ID or name/);
  assert.throws(() => toMemberEditorDto({ _id: new mongoose.Types.ObjectId() }), /missing its ID or name/);
});
