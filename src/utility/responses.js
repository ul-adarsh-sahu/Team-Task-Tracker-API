/**
 * Consistent response helpers that match the assignment spec:
 * { status, code, message, data? }
 */

const send = (res, status, code, message, data = null) => {
  const body = { status, code, message };
  if (data !== null) body.data = data;
  return res.status(status).json(body);
};

const success = (res, data, message = "success") =>
  send(res, 200, "SUCCESS", message, data);

const created = (res, data, message = "created") =>
  send(res, 201, "CREATED", message, data);

const validationError = (res, message) =>
  send(res, 400, "VALIDATION_ERROR", message);

const badRequest = (res, message, code = "BAD_REQUEST") =>
  send(res, 400, code, message);

const unauthorized = (res, message = "Unauthorized") =>
  send(res, 401, "UNAUTHORIZED", message);

const forbidden = (res, message = "Access denied") =>
  send(res, 403, "FORBIDDEN", message);

const notFound = (res, message = "Not found") =>
  send(res, 404, "NOT_FOUND", message);

const conflict = (res, message) =>
  send(res, 409, "CONFLICT", message);

const internalError = (res) =>
  send(res, 500, "INTERNAL_SERVER_ERROR", "Internal server error");

module.exports = {
  send,
  success,
  created,
  validationError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
};
