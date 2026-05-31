/**
 * Unit tests — Task Service
 * Covers: status transitions, RBAC, caching, CRUD edge cases
 * Mocks: Task model, User model, redis utility
 */

jest.mock("../../src/models/task.model");
jest.mock("../../src/models/user.model");
jest.mock("../../src/utility/redis");

const Task = require("../../src/models/task.model");
const User = require("../../src/models/user.model");
const redis = require("../../src/utility/redis");
const taskService = require("../../src/api/task/task.service");
const { STATUS_TRANSITIONS, TASK_STATUS, ROLES } = require("../../src/utility/constants");

// ── helpers ──────────────────────────────────────────────────────────────────

const ADMIN_ID   = "admin_000000000000";
const MANAGER_ID = "mgr_0000000000000";
const MEMBER_ID  = "member_00000000000";
const ASSIGNEE_ID = "assignee_00000000";
const ORG_ID     = "org_0000000000000";
const PROJECT_ID = "project_000000000";
const TASK_ID    = "task_00000000000000";

const baseTask = (overrides = {}) => ({
  _id:            TASK_ID,
  title:          "Fix bug #42",
  description:    "",
  priority:       "MEDIUM",
  status:         "TODO",
  assigneeId:     ASSIGNEE_ID,
  projectId:      PROJECT_ID,
  organizationId: ORG_ID,
  createdBy:      ADMIN_ID,
  due_date:       null,
  completedAt:    null,
  save:           jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default redis stubs (no-ops)
  redis.cacheGet.mockResolvedValue(null);
  redis.cacheSet.mockResolvedValue(true);
  redis.cacheDelPattern.mockResolvedValue(true);
});

// ── STATUS_TRANSITIONS constant ───────────────────────────────────────────────

describe("STATUS_TRANSITIONS constant", () => {
  it("TODO allows IN_PROGRESS and BLOCKED", () => {
    expect(STATUS_TRANSITIONS["TODO"]).toEqual(expect.arrayContaining(["IN_PROGRESS", "BLOCKED"]));
  });

  it("IN_PROGRESS allows IN_REVIEW and BLOCKED", () => {
    expect(STATUS_TRANSITIONS["IN_PROGRESS"]).toEqual(expect.arrayContaining(["IN_REVIEW", "BLOCKED"]));
  });

  it("IN_REVIEW allows DONE and BLOCKED", () => {
    expect(STATUS_TRANSITIONS["IN_REVIEW"]).toEqual(expect.arrayContaining(["DONE", "BLOCKED"]));
  });

  it("DONE is a terminal state (no transitions)", () => {
    expect(STATUS_TRANSITIONS["DONE"]).toHaveLength(0);
  });

  it("BLOCKED allows IN_PROGRESS", () => {
    expect(STATUS_TRANSITIONS["BLOCKED"]).toContain("IN_PROGRESS");
    expect(STATUS_TRANSITIONS["BLOCKED"]).not.toContain("DONE");
  });
});

// ── createTask ───────────────────────────────────────────────────────────────

describe("taskService.createTask", () => {
  it("creates a task and invalidates assignee cache", async () => {
    User.findOne.mockResolvedValue({ _id: ASSIGNEE_ID });  // assignee in org
    Task.create.mockResolvedValue(baseTask());

    const result = await taskService.createTask({
      title: "Fix bug #42", projectId: PROJECT_ID,
      organizationId: ORG_ID, createdBy: ADMIN_ID,
      assigneeId: ASSIGNEE_ID,
    });

    expect(result.status).toBe(201);
    expect(Task.create).toHaveBeenCalled();
    expect(redis.cacheDelPattern).toHaveBeenCalledWith(`tasks:assignee:${ASSIGNEE_ID}:*`);
  });

  it("returns 400 when assigneeId does not belong to org", async () => {
    User.findOne.mockResolvedValue(null); // not found in org

    const result = await taskService.createTask({
      title: "Fix bug", projectId: PROJECT_ID,
      organizationId: ORG_ID, createdBy: ADMIN_ID,
      assigneeId: "stranger_id",
    });

    expect(result.status).toBe(400);
    expect(result.message).toMatch(/assignee not found/i);
    expect(Task.create).not.toHaveBeenCalled();
  });
});

// ── getTasks ─────────────────────────────────────────────────────────────────

describe("taskService.getTasks", () => {
  const buildQuery = (overrides = {}) => ({
    organizationId: ORG_ID,
    requesterId: ADMIN_ID,
    requestorRole: ROLES.ADMIN,
    page: 1, limit: 10,
    ...overrides,
  });

  it("returns paginated tasks for ADMIN", async () => {
    const tasks = [baseTask()];
    const populateMock = { lean: jest.fn().mockResolvedValue(tasks) };
    const chainMock = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue(populateMock),
    };
    Task.find.mockReturnValue(chainMock);
    Task.countDocuments.mockResolvedValue(1);

    const result = await taskService.getTasks(buildQuery());

    expect(result.status).toBe(200);
    expect(result.data.tasks).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it("forces assigneeId filter for MEMBER role", async () => {
    const tasks = [];
    const populateMock = { lean: jest.fn().mockResolvedValue(tasks) };
    const chainMock = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue(populateMock),
    };
    Task.find.mockReturnValue(chainMock);
    Task.countDocuments.mockResolvedValue(0);

    await taskService.getTasks(buildQuery({
      requesterId: MEMBER_ID,
      requestorRole: ROLES.MEMBER,
      assigneeId: ADMIN_ID, // should be ignored, forced to MEMBER_ID
    }));

    // filter passed to Task.find must use MEMBER_ID, not ADMIN_ID
    const filterArg = Task.find.mock.calls[0][0];
    expect(filterArg.assigneeId).toBe(MEMBER_ID);
  });

  it("returns cached result when assignee filter + cache hit", async () => {
    const cached = { tasks: [baseTask()], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
    redis.cacheGet.mockResolvedValue(cached);

    const result = await taskService.getTasks(buildQuery({ assigneeId: ASSIGNEE_ID }));

    expect(result.data).toEqual(cached);
    expect(Task.find).not.toHaveBeenCalled(); // served from cache
  });
});

// ── getTaskById ───────────────────────────────────────────────────────────────

describe("taskService.getTaskById", () => {
  it("returns task for ADMIN regardless of assignee", async () => {
    const task = { ...baseTask(), assigneeId: { _id: ASSIGNEE_ID } };
    Task.findOne.mockReturnValue({ populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(task) });

    const result = await taskService.getTaskById({
      taskId: TASK_ID, organizationId: ORG_ID,
      requesterId: ADMIN_ID, requestorRole: ROLES.ADMIN,
    });

    expect(result.status).toBe(200);
  });

  it("returns 403 for MEMBER viewing someone else's task", async () => {
    const task = { ...baseTask(), assigneeId: { _id: ASSIGNEE_ID } };
    Task.findOne.mockReturnValue({ populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(task) });

    const result = await taskService.getTaskById({
      taskId: TASK_ID, organizationId: ORG_ID,
      requesterId: MEMBER_ID,   // MEMBER_ID !== ASSIGNEE_ID
      requestorRole: ROLES.MEMBER,
    });

    expect(result.status).toBe(403);
  });

  it("returns 404 when task not found", async () => {
    Task.findOne.mockReturnValue({ populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });

    const result = await taskService.getTaskById({
      taskId: "nonexistent", organizationId: ORG_ID,
      requesterId: ADMIN_ID, requestorRole: ROLES.ADMIN,
    });

    expect(result.status).toBe(404);
  });
});

// ── updateTaskStatus ──────────────────────────────────────────────────────────

describe("taskService.updateTaskStatus", () => {
  const callUpdateStatus = (currentStatus, newStatus, role, requesterId = ADMIN_ID) =>
    taskService.updateTaskStatus({
      taskId: TASK_ID,
      organizationId: ORG_ID,
      newStatus,
      requesterId,
      requestorRole: role,
    });

  beforeEach(() => {
    // Each test overrides Task.findOne as needed
  });

  it.each([
    ["TODO",        "IN_PROGRESS"],
    ["TODO",        "BLOCKED"],
    ["IN_PROGRESS", "IN_REVIEW"],
    ["IN_PROGRESS", "BLOCKED"],
    ["IN_REVIEW",   "DONE"],
    ["IN_REVIEW",   "BLOCKED"],
    ["BLOCKED",     "IN_PROGRESS"],
  ])("allows valid transition %s → %s", async (from, to) => {
    const task = baseTask({ status: from, assigneeId: ASSIGNEE_ID });
    Task.findOne.mockResolvedValue(task);

    const result = await callUpdateStatus(from, to, ROLES.ADMIN);

    expect(result.status).toBe(200);
    expect(task.status).toBe(to);
    expect(task.save).toHaveBeenCalled();
  });

  it.each([
    ["TODO",        "DONE"],
    ["TODO",        "IN_REVIEW"],
    ["IN_PROGRESS", "TODO"],
    ["IN_REVIEW",   "IN_PROGRESS"],
    ["DONE",        "TODO"],
    ["DONE",        "IN_PROGRESS"],
    ["BLOCKED",     "DONE"],
  ])("rejects invalid transition %s → %s", async (from, to) => {
    const task = baseTask({ status: from, assigneeId: ASSIGNEE_ID });
    Task.findOne.mockResolvedValue(task);

    const result = await callUpdateStatus(from, to, ROLES.ADMIN);

    expect(result.status).toBe(400);
    expect(result.code).toBe("INVALID_TRANSITION");
  });

  it("sets completedAt when transitioning to DONE", async () => {
    const task = baseTask({ status: "IN_REVIEW", assigneeId: ASSIGNEE_ID });
    Task.findOne.mockResolvedValue(task);

    const result = await callUpdateStatus("IN_REVIEW", "DONE", ROLES.ADMIN);

    expect(result.status).toBe(200);
    expect(task.completedAt).toBeInstanceOf(Date);
  });

  it("allows assignee (MEMBER) to change status", async () => {
    const task = baseTask({ status: "TODO", assigneeId: MEMBER_ID });
    Task.findOne.mockResolvedValue(task);

    const result = await callUpdateStatus("TODO", "IN_PROGRESS", ROLES.MEMBER, MEMBER_ID);

    expect(result.status).toBe(200);
  });

  it("blocks non-assignee MEMBER from changing status", async () => {
    const task = baseTask({ status: "TODO", assigneeId: ASSIGNEE_ID });
    Task.findOne.mockResolvedValue(task);

    // MEMBER_ID !== ASSIGNEE_ID
    const result = await callUpdateStatus("TODO", "IN_PROGRESS", ROLES.MEMBER, MEMBER_ID);

    expect(result.status).toBe(403);
    expect(task.save).not.toHaveBeenCalled();
  });

  it("returns 404 when task not found", async () => {
    Task.findOne.mockResolvedValue(null);

    const result = await callUpdateStatus("TODO", "IN_PROGRESS", ROLES.ADMIN);

    expect(result.status).toBe(404);
  });

  it("invalidates assignee cache after status update", async () => {
    const task = baseTask({ status: "TODO", assigneeId: ASSIGNEE_ID });
    Task.findOne.mockResolvedValue(task);

    await callUpdateStatus("TODO", "IN_PROGRESS", ROLES.ADMIN);

    expect(redis.cacheDelPattern).toHaveBeenCalledWith(`tasks:assignee:${ASSIGNEE_ID}:*`);
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe("taskService.deleteTask", () => {
  it("deletes task and invalidates cache", async () => {
    Task.findOneAndDelete.mockResolvedValue(baseTask());

    const result = await taskService.deleteTask({ taskId: TASK_ID, organizationId: ORG_ID });

    expect(result.status).toBe(200);
    expect(redis.cacheDelPattern).toHaveBeenCalledWith(`tasks:assignee:${ASSIGNEE_ID}:*`);
  });

  it("returns 404 when task not found", async () => {
    Task.findOneAndDelete.mockResolvedValue(null);

    const result = await taskService.deleteTask({ taskId: "ghost", organizationId: ORG_ID });

    expect(result.status).toBe(404);
    expect(redis.cacheDelPattern).not.toHaveBeenCalled();
  });
});
