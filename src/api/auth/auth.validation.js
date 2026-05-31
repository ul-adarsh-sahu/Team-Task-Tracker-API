const Joi = require("joi");

const register = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "name is required",
    "string.min": "name must be at least 2 characters",
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "email must be a valid email address",
    "string.empty": "email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "password must be at least 6 characters",
    "string.empty": "password is required",
  }),
  orgName: Joi.string().trim().min(2).max(100),
  orgId: Joi.string().hex().length(24).messages({
    "string.length": "orgId must be a valid id",
  }),
})
  .xor("orgName", "orgId")
  .messages({
    "object.xor": "Provide either orgName (create new org) or orgId (join existing)",
  });

const login = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.empty": "email is required",
    "string.email": "email must be a valid email address",
  }),
  password: Joi.string().required().messages({
    "string.empty": "password is required",
  }),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required().messages({
    "string.empty": "refreshToken is required",
  }),
});

module.exports = { register, login, refresh };
