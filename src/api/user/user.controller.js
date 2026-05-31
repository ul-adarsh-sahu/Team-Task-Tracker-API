const userService = require("./user.service");
const responses = require("../../utility/responses");

const getUsers = async (req, res) => {
  try {
    const result = await userService.getUsers({ organizationId: req.organizationId });
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const getUserById = async (req, res) => {
  try {
    const result = await userService.getUserById({
      userId: req.params.id,
      organizationId: req.organizationId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const updateRole = async (req, res) => {
  try {
    const result = await userService.updateRole({
      userId: req.params.id,
      role: req.body.role,
      organizationId: req.organizationId,
      requesterId: req.userId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status === 400) return responses.badRequest(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser({
      userId: req.params.id,
      organizationId: req.organizationId,
      requesterId: req.userId,
    });
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status === 400) return responses.badRequest(res, result.message);
    return responses.success(res, null, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

module.exports = { getUsers, getUserById, updateRole, deleteUser };
