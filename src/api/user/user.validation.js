const Joi = require("joi");

const updateRole = Joi.object({
  role: Joi.string().valid("ADMIN", "MANAGER", "MEMBER").required().messages({
    "any.only": "role must be one of: ADMIN, MANAGER, MEMBER",
    "string.empty": "role is required",
  }),
});

module.exports = { updateRole };
