const mongoose = require("mongoose");
const { ROLES } = require("../utility/constants");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, role: 1 });

module.exports = mongoose.model("User", userSchema);
