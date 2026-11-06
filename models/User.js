import mongoose from "mongoose";

const userRoles = ["ADMIN", "MEMBER", "USER"];
const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    registeredAt: {
      type: Date,
      required: true,
      immutable: true,
      default: Date.now,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 32,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    role: {
      type: String,
      enum: ["ADMIN", "MEMBER", "USER"],
      default: "MEMBER",
      required: true,
    },
  },
  { timestamps: true },
);

const cachedUser = mongoose.models.User;
const cachedRole = cachedUser?.schema.path("role");
if (
  cachedUser &&
  (!userRoles.every((role) => cachedRole?.enumValues.includes(role)) ||
    cachedRole?.defaultValue !== "MEMBER")
) {
  delete mongoose.models.User;
}

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
