const responses = require("../utility/responses");

/**
 * Generic validation middleware factory.
 * Usage: validate(JoiSchema) — pass as middleware before controller.
 * Validates req.body by default; pass "query" or "params" for other sources.
 */
const validate = (schema, source = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return responses.validationError(res, message);
  }

  // Replace with sanitized/coerced values from Joi
  req[source] = value;
  next();
};

module.exports = validate;
