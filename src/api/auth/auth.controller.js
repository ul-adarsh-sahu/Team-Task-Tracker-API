const authService = require("./auth.service");
const responses = require("../../utility/responses");

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    if (result.status === 409) return responses.conflict(res, result.message);
    if (result.status === 404) return responses.notFound(res, result.message);
    if (result.status !== 201) return responses.badRequest(res, result.message);
    return responses.created(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    if (result.status !== 200) return responses.unauthorized(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const refresh = async (req, res) => {
  try {
    const result = await authService.refresh(req.body);
    if (result.status !== 200) return responses.unauthorized(res, result.message);
    return responses.success(res, result.data, result.message);
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

const logout = async (req, res) => {
  try {
    await authService.logout(req.userId);
    return responses.success(res, null, "Logged out successfully");
  } catch (err) {
    console.error(err);
    return responses.internalError(res);
  }
};

module.exports = { register, login, refresh, logout };
