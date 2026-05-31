const Joi = require("joi");

const create = Joi.object({
  name: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "name is required",
    "string.min": "name must be at least 2 characters",
  }),
  description: Joi.string().trim().max(1000).allow("").default(""),
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(200).messages({
    "string.min": "name must be at least 2 characters",
  }),
  description: Joi.string().trim().max(1000).allow(""),
}).min(1).messages({
  "object.min": "Provide at least one field to update",
});

module.exports = { create, update };
