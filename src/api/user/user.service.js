const User = require("../../models/user.model");

const getUsers = async ({ organizationId }) => {
  const users = await User.find({ organizationId })
    .select("-password -refreshToken")
    .lean();
  return { status: 200, message: "Users fetched", data: users };
};

const getUserById = async ({ userId, organizationId }) => {
  const user = await User.findOne({ _id: userId, organizationId })
    .select("-password -refreshToken")
    .lean();
  if (!user) return { status: 404, message: "User not found" };
  return { status: 200, message: "User fetched", data: user };
};

const updateRole = async ({ userId, role, organizationId, requesterId }) => {
  if (String(userId) === String(requesterId)) {
    return { status: 400, message: "You cannot change your own role" };
  }
  const user = await User.findOneAndUpdate(
    { _id: userId, organizationId },
    { role },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) return { status: 404, message: "User not found" };
  return { status: 200, message: "Role updated successfully", data: user };
};

const deleteUser = async ({ userId, organizationId, requesterId }) => {
  if (String(userId) === String(requesterId)) {
    return { status: 400, message: "You cannot delete yourself" };
  }
  const user = await User.findOneAndDelete({ _id: userId, organizationId });
  if (!user) return { status: 404, message: "User not found" };
  return { status: 200, message: "User removed from organization" };
};

module.exports = { getUsers, getUserById, updateRole, deleteUser };
