const taskService = require("./task.service");
const responses = require("../../utility/responses");

const create = async (req, res) => {
  try {
    const result = await taskService.createTask({
      ...req.body,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    if (result.status === 400) return responses.badRequest(res, result.message);
    return responses.created(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const getAll = async (req, res) => {
  try {
    const result = await taskService.getTasks({
      organizationId: req.organizationId,
      requesterId: req.userId,
      requestorRole: req.userRole,
      ...req.query,
    });
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const getById = async (req, res) => {
  try {
    const result = await taskService.getTaskById({
      taskId: req.params.id,
      organizationId: req.organizationId,
      requesterId: req.userId,
      requestorRole: req.userRole,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status === 403) return responses.forbidden(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const update = async (req, res) => {
  try {
    const result = await taskService.updateTask({
      taskId: req.params.id,
      organizationId: req.organizationId,
      requesterId: req.userId,
      requestorRole: req.userRole,
      updates: req.body,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status === 403) return responses.forbidden(res, result.message);
    if (result.status === 400) return responses.badRequest(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const updateStatus = async (req, res) => {
  try {
    const result = await taskService.updateTaskStatus({
      taskId: req.params.id,
      organizationId: req.organizationId,
      newStatus: req.body.status,
      requesterId: req.userId,
      requestorRole: req.userRole,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status === 403) return responses.forbidden(res, result.message);
    if (result.status === 400) return responses.send(res, 400, result.code || "BAD_REQUEST", result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const remove = async (req, res) => {
  try {
    const result = await taskService.deleteTask({
      taskId: req.params.id,
      organizationId: req.organizationId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    return responses.success(res, null, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

module.exports = { create, getAll, getById, update, updateStatus, remove };
