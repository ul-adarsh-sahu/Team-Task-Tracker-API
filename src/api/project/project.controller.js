const projectService = require("./project.service");
const responses = require("../../utility/responses");

const create = async (req, res) => {
  try {
    const result = await projectService.createProject({
      name: req.body.name,
      description: req.body.description || "",
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    return responses.created(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const getAll = async (req, res) => {
  try {
    const result = await projectService.getProjects({ organizationId: req.organizationId });
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const getById = async (req, res) => {
  try {
    const result = await projectService.getProjectById({
      projectId: req.params.id,
      organizationId: req.organizationId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const update = async (req, res) => {
  try {
    const result = await projectService.updateProject({
      projectId: req.params.id,
      organizationId: req.organizationId,
      updates: req.body,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const remove = async (req, res) => {
  try {
    const result = await projectService.deleteProject({
      projectId: req.params.id,
      organizationId: req.organizationId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    return responses.success(res, null, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

module.exports = { create, getAll, getById, update, remove };
