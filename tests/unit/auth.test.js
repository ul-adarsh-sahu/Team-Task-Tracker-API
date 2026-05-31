/**
 * Unit tests — Auth Service
 * Mocks: mongoose models (User, Organization), bcryptjs, jsonwebtoken
 */

jest.mock("../../src/models/user.model");
jest.mock("../../src/models/organization.model");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../../src/models/user.model");
const Organization = require("../../src/models/organization.model");
const authService  = require("../../src/api/auth/auth.service");

// ── helpers ──────────────────────────────────────────────────────────────────

const mockUser = (overrides = {}) => ({
  _id:            "user_id_1",
  name:           "Alice",
  email:          "alice@example.com",
  password:       "hashed_pw",
  role:           "ADMIN",
  organizationId: "org_id_1",
  refreshToken:   null,
  save:           jest.fn().mockResolvedValue(true),
  ...overrides,
});

const mockOrg = (overrides = {}) => ({
  _id:       "org_id_1",
  name:      "Acme Corp",
  createdBy: null,
  save:      jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  // jwt.sign called twice per auth flow: 1st = accessToken, 2nd = refreshToken
  jwt.sign
    .mockReturnValueOnce("mock_access_token")
    .mockReturnValueOnce("mock_refresh_token");
});

// ── register ─────────────────────────────────────────────────────────────────

describe("authService.register", () => {
  it("creates a new org and registers user as ADMIN when orgName provided", async () => {
    User.findOne.mockResolvedValue(null);          // no duplicate email
    Organization.create.mockResolvedValue(mockOrg());
    User.create.mockResolvedValue(mockUser());

    const result = await authService.register({
      name: "Alice", email: "alice@example.com",
      password: "secret123", orgName: "Acme Corp",
    });

    expect(result.status).toBe(201);
    expect(result.data.user.role).toBe("ADMIN");
    expect(Organization.create).toHaveBeenCalledWith({ name: "Acme Corp" });
    expect(result.data.accessToken).toBe("mock_access_token");
    expect(result.data.refreshToken).toBe("mock_refresh_token");
  });

  it("returns 409 when email already registered", async () => {
    User.findOne.mockResolvedValue(mockUser());    // duplicate

    const result = await authService.register({
      name: "Alice", email: "alice@example.com",
      password: "secret123", orgName: "Acme Corp",
    });

    expect(result.status).toBe(409);
    expect(result.message).toMatch(/already registered/i);
  });

  it("joins existing org as MEMBER when orgId provided and org exists", async () => {
    User.findOne.mockResolvedValue(null);
    Organization.findById.mockResolvedValue(mockOrg());
    User.create.mockResolvedValue(mockUser({ role: "MEMBER" }));

    const result = await authService.register({
      name: "Bob", email: "bob@example.com",
      password: "secret123", orgId: "org_id_1",
    });

    expect(result.status).toBe(201);
    expect(result.data.user.role).toBe("MEMBER");
    expect(Organization.findById).toHaveBeenCalledWith("org_id_1");
  });

  it("returns 404 when orgId does not exist", async () => {
    User.findOne.mockResolvedValue(null);
    Organization.findById.mockResolvedValue(null); // not found

    const result = await authService.register({
      name: "Bob", email: "bob@example.com",
      password: "secret123", orgId: "bad_org_id",
    });

    expect(result.status).toBe(404);
    expect(result.message).toMatch(/organization not found/i);
  });
});

// ── login ────────────────────────────────────────────────────────────────────

describe("authService.login", () => {
  it("returns tokens on valid credentials", async () => {
    const user = mockUser();
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({ email: "alice@example.com", password: "secret123" });

    expect(result.status).toBe(200);
    expect(result.data.accessToken).toBe("mock_access_token");
    expect(user.save).toHaveBeenCalled();
  });

  it("returns 401 when user not found", async () => {
    User.findOne.mockResolvedValue(null);

    const result = await authService.login({ email: "unknown@example.com", password: "x" });

    expect(result.status).toBe(401);
    expect(result.message).toMatch(/invalid email or password/i);
  });

  it("returns 401 on wrong password", async () => {
    User.findOne.mockResolvedValue(mockUser());
    bcrypt.compare.mockResolvedValue(false);       // wrong pw

    const result = await authService.login({ email: "alice@example.com", password: "wrong" });

    expect(result.status).toBe(401);
    expect(result.message).toMatch(/invalid email or password/i);
  });
});

// ── refresh ──────────────────────────────────────────────────────────────────

describe("authService.refresh", () => {
  it("rotates tokens when refresh token is valid and matches DB", async () => {
    const decoded = { id: "user_id_1", role: "ADMIN", organizationId: "org_id_1" };
    jwt.verify.mockReturnValue(decoded);

    const user = mockUser({ refreshToken: "old_refresh" });
    User.findById.mockResolvedValue(user);

    const result = await authService.refresh({ refreshToken: "old_refresh" });

    expect(result.status).toBe(200);
    expect(result.data.accessToken).toBe("mock_access_token");
    expect(user.save).toHaveBeenCalled();
  });

  it("returns 401 when jwt.verify throws (expired/invalid token)", async () => {
    jwt.verify.mockImplementation(() => { throw new Error("jwt expired"); });

    const result = await authService.refresh({ refreshToken: "bad_token" });

    expect(result.status).toBe(401);
    expect(result.message).toMatch(/invalid or expired/i);
  });

  it("returns 401 when stored token does not match (revocation/reuse)", async () => {
    const decoded = { id: "user_id_1" };
    jwt.verify.mockReturnValue(decoded);

    // DB has a DIFFERENT token stored → reuse detected
    const user = mockUser({ refreshToken: "different_token_in_db" });
    User.findById.mockResolvedValue(user);

    const result = await authService.refresh({ refreshToken: "presented_token" });

    expect(result.status).toBe(401);
    expect(result.message).toMatch(/revoked/i);
  });

  it("returns 401 when user is not found", async () => {
    jwt.verify.mockReturnValue({ id: "ghost_id" });
    User.findById.mockResolvedValue(null);

    const result = await authService.refresh({ refreshToken: "some_token" });

    expect(result.status).toBe(401);
  });
});

// ── logout ───────────────────────────────────────────────────────────────────

describe("authService.logout", () => {
  it("nullifies refreshToken in DB", async () => {
    User.findByIdAndUpdate.mockResolvedValue({});

    const result = await authService.logout("user_id_1");

    expect(result.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user_id_1", { refreshToken: null });
  });
});
