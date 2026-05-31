const mongoose = require("mongoose");
const Task = require("../../models/task.model");
const User = require("../../models/user.model");
const { ROLES, TASK_STATUS, STATUS_TRANSITIONS } = require("../../utility/constants");
const { cacheGet, cacheSet, cacheDelPattern } = require("../../utility/redis");

const CACHE_TTL = 300; // 5 minutes

// Cache key covers all filter combinations for a given assignee
const cacheKey = (assigneeId, page, limit, status, priority) =>
  `tasks:assignee:${assigneeId}:page${page}:limit${limit}:status${status || "all"}:priority${priority || "all"}`;

// Wipe all cached pages for an assignee when their tasks change
const invalidateAssignee = async (assigneeId) => {
  if (assigneeId) await cacheDelPattern(`tasks:assignee:${String(assigneeId)}:*`);
};

const createTask = async ({ title, description, priority, assigneeId, projectId, organizationId, createdBy, due_date }) => {
  if (assigneeId) {
    const assignee = await User.findOne({ _id: assigneeId, organizationId });
    if (!assignee) return { status: 400, message: "Assignee not found in this organization" };
  }

  const task = await Task.create({
    title,
    description,
    priority,
    assigneeId: assigneeId || null,
    projectId,
    organizationId,
    createdBy,
    due_date: due_date || null,
  });

  await invalidateAssignee(assigneeId);
  return { status: 201, message: "Task created", data: task };
};

const getTasks = async ({ organizationId, requesterId, requestorRole, page, limit, status, priority, assigneeId, projectId }) => {
  // MEMBERs can only see tasks assigned to them
  const filterAssigneeId = requestorRole === ROLES.MEMBER ? requesterId : assigneeId;

  const filter = { organizationId };
  if (projectId)        filter.projectId  = projectId;
  if (status)           filter.status     = status;
  if (priority)         filter.priority   = priority;
  if (filterAssigneeId) filter.assigneeId = filterAssigneeId;

  // Use cache only when filtering by a specific assignee
  if (filterAssigneeId) {
    const key = cacheKey(filterAssigneeId, page, limit, status, priority);
    const cached = await cacheGet(key);
    if (cached) return { status: 200, message: "Tasks fetched", data: cached };
  }

  const skip = (page - 1) * limit;
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assigneeId", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  const result = {
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };

  if (filterAssigneeId) {
    await cacheSet(cacheKey(filterAssigneeId, page, limit, status, priority), result, CACHE_TTL);
  }

  return { status: 200, message: "Tasks fetched", data: result };
};

const getTaskById = async ({ taskId, organizationId, requesterId, requestorRole }) => {
  const task = await Task.findOne({ _id: taskId, organizationId })
    .populate("assigneeId", "name email")
    .populate("createdBy", "name email")
    .lean();

  if (!task) return { status: 404, message: "Task not found" };

  if (requestorRole === ROLES.MEMBER && String(task.assigneeId?._id) !== String(requesterId)) {
    return { status: 403, message: "You can only view tasks assigned to you" };
  }

  return { status: 200, message: "Task fetched", data: task };
};

const updateTask = async ({ taskId, organizationId, requesterId, requestorRole, updates }) => {
  const task = await Task.findOne({ _id: taskId, organizationId });
  if (!task) return { status: 404, message: "Task not found" };

  // MEMBER can only update their own tasks and cannot reassign
  if (requestorRole === ROLES.MEMBER) {
    if (String(task.assigneeId) !== String(requesterId)) {
      return { status: 403, message: "You can only update tasks assigned to you" };
    }
    delete updates.assigneeId;
    delete updates.projectId;
  }

  // Validate new assignee belongs to org
  if (updates.assigneeId) {
    const assignee = await User.findOne({ _id: updates.assigneeId, organizationId });
    if (!assignee) return { status: 400, message: "Assignee not found in this organization" };
  }

  const oldAssigneeId = task.assigneeId;
  const newAssigneeId = updates.assigneeId || task.assigneeId;

  Object.assign(task, updates);
  await task.save();

  // Invalidate both old and new assignee caches
  await invalidateAssignee(String(oldAssigneeId));
  if (String(oldAssigneeId) !== String(newAssigneeId)) {
    await invalidateAssignee(String(newAssigneeId));
  }

  return { status: 200, message: "Task updated", data: task };
};

const updateTaskStatus = async ({ taskId, organizationId, newStatus, requesterId, requestorRole }) => {
  const task = await Task.findOne({ _id: taskId, organizationId });
  if (!task) return { status: 404, message: "Task not found" };

  const isAssignee  = String(task.assigneeId) === String(requesterId);
  const isPrivileged = [ROLES.ADMIN, ROLES.MANAGER].includes(requestorRole);

  if (!isAssignee && !isPrivileged) {
    return { status: 403, message: "Only the assignee or a manager can change task status" };
  }

  const allowed = STATUS_TRANSITIONS[task.status];
  if (!allowed.includes(newStatus)) {
    return {
      status: 400,
      code: "INVALID_TRANSITION",
      message: `Cannot transition from ${task.status} to ${newStatus}. Allowed: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}`,
    };
  }

  task.status = newStatus;
  if (newStatus === TASK_STATUS.DONE) task.completedAt = new Date();
  await task.save();

  await invalidateAssignee(String(task.assigneeId));
  return { status: 200, message: "Task status updated", data: task };
};

const deleteTask = async ({ taskId, organizationId }) => {
  const task = await Task.findOneAndDelete({ _id: taskId, organizationId });
  if (!task) return { status: 404, message: "Task not found" };
  await invalidateAssignee(String(task.assigneeId));
  return { status: 200, message: "Task deleted" };
};

module.exports = { createTask, getTasks, getTaskById, updateTask, updateTaskStatus, deleteTask };
