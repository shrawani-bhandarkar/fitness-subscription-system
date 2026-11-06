import mongoose from "mongoose";

const adminAuditActions = [
  "BALANCE_WAIVED",
  "PLAN_CREATED",
  "PLAN_UPDATED",
  "PLAN_ARCHIVED",
  "PLAN_DELETED",
  "COUPON_CREATED",
  "COUPON_UPDATED",
  "COUPON_DELETED",
  "MEMBER_UPDATED",
  "MEMBER_DELETION_PENDING",
  "MEMBER_DELETION_FAILED",
  "MEMBER_DELETED",
];

const adminAuditSchema = new mongoose.Schema(
  {
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      required: function requireAdministratorActor() {
        return this.after?.source !== "CLERK_WEBHOOK";
      },
    },
    clerkUserIdHash: {
      type: String,
      trim: true,
      default: undefined,
      unique: true,
      sparse: true,
    },
    entityType: {
      type: String,
      enum: ["SUBSCRIPTION", "PLAN", "COUPON", "USER"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: adminAuditActions,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

const cachedAdminAudit = mongoose.models.AdminAudit;
const cachedActions = cachedAdminAudit?.schema.path("action")?.enumValues ?? [];
if (
  cachedAdminAudit &&
  (!adminAuditActions.every((action) => cachedActions.includes(action)) ||
    !cachedAdminAudit.schema.path("clerkUserIdHash") ||
    typeof cachedAdminAudit.schema.path("adminUserId")?.options.required !== "function")
) {
  delete mongoose.models.AdminAudit;
}

const AdminAudit =
  mongoose.models.AdminAudit || mongoose.model("AdminAudit", adminAuditSchema);

export default AdminAudit;
