const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const Organization = require("../../models/organization.model");
const { ROLES } = require("../../utility/constants");

const generateTokens = (user) => {
  const payload = {
    id: user._id,
    role: user.role,
    organizationId: user.organizationId,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
  return { accessToken, refreshToken };
};

const register = async ({ name, email, password, orgName, orgId }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    return { status: 409, message: "Email is already registered" };
  }

  let organization;
  let role = ROLES.MEMBER;

  if (orgName) {
    // Create a new org — this user becomes the ADMIN
    organization = await Organization.create({ name: orgName });
    role = ROLES.ADMIN;
  } else {
    organization = await Organization.findById(orgId);
    if (!organization) {
      return { status: 404, message: "Organization not found" };
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organizationId: organization._id,
  });

  // Link the org back to its creator
  if (role === ROLES.ADMIN) {
    organization.createdBy = user._id;
    await organization.save();
  }

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    status: 201,
    message: "Registered successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: { id: organization._id, name: organization.name },
      accessToken,
      refreshToken,
    },
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    return { status: 401, message: "Invalid email or password" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { status: 401, message: "Invalid email or password" };
  }

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  return {
    status: 200,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken,
      refreshToken,
    },
  };
};

const refresh = async ({ refreshToken }) => {
  if (!refreshToken) {
    return { status: 400, message: "refreshToken is required" };
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return { status: 401, message: "Invalid or expired refresh token" };
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    // Token reuse detected or already logged out
    return { status: 401, message: "Refresh token has been revoked" };
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  user.refreshToken = newRefreshToken;
  await user.save();

  return {
    status: 200,
    message: "Token refreshed",
    data: { accessToken, refreshToken: newRefreshToken },
  };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  return { status: 200, message: "Logged out successfully" };
};

module.exports = { register, login, refresh, logout };
