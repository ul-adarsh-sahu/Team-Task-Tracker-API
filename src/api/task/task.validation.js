const Joi = require("joi");
const { TASK_STATUS, TASK_PRIORITY } = require("../../utility/constants");

const create = Joi.object({
  title: Joi.string().trim().min(1).max(300).required().messages({
    "string.empty": "title is required",
    "string.max": "title must be under 300 characters",
  }),
  description: Joi.string().trim().max(2000).allow("").default(""),
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY))
    .default(TASK_PRIORITY.MEDIUM)
    .messages({ "any.only": "priority must be LOW, MEDIUM or HIGH" }),
  assigneeId: Joi.string().hex().length(24).allow(null).messages({
    "string.length": "assigneeId must be a valid id",
  }),
  projectId: Joi.string().hex().length(24).required().messages({
    "string.empty": "projectId is required",
    "string.length": "projectId must be a valid id",
  }),
  due_date: Joi.date().greater("now").allow(null).messages({
    "date.greater": "due_date must be a future date",
  }),
});

const update = Joi.object({
  title: Joi.string().trim().min(1).max(300),
  description: Joi.string().trim().max(2000).allow(""),
  priority: Joi.string()
    .valid(...Object.values(TASK_PRIORITY))
    .messages({ "any.only": "priority must be LOW, MEDIUM or HIGH" }),
  assigneeId: Joi.string().hex().length(24).allow(null),
  due_date: Joi.date().greater("now").allow(null).messages({
    "date.greater": "due_date must be a future date",
  }),
}).min(1).messages({ "object.min": "Provide at least one field to update" });

const updateStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(TASK_STATUS))
    .required()
    .messages({
      "any.only": `status must be one of: ${Object.values(TASK_STATUS).join(", ")}`,
      "string.empty": "status is required",
    }),
});

const listQuery = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(10),
  status:     Joi.string().valid(...Object.values(TASK_STATUS)),
  priority:   Joi.string().valid(...Object.values(TASK_PRIORITY)),
  assigneeId: Joi.string().hex().length(24),
  projectId:  Joi.string().hex().length(24),
});

module.exports = { create, update, updateStatus, listQuery };
