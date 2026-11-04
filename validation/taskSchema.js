
const Joi = require("joi");

// Creating a task requires a title.
const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),

  // If omitted, isCompleted defaults to false.
  isCompleted: Joi.boolean().default(false).not(null),
});

// PATCH allows changing either field or both.
const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).not(null),
  isCompleted: Joi.boolean().not(null),
})
  // Reject empty update requests.
  .min(1)
  .message("No attributes to change were specified.");

module.exports = { taskSchema, patchTaskSchema };
