
const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const pool = require("../db/pg-pool");

// 1. CREATE TASK: POST /api/tasks
exports.create = async (req, res, next) => {
  try {
    const { error, value } = taskSchema.validate(req.body || {});

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Save the task in PostgreSQL.
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id]
    );

    const newTask = result.rows[0];

    return res.status(201).json(newTask);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

// 2. GET ALL TASKS: GET /api/tasks
exports.index = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE user_id = $1`,
      [global.user_id]
    );

    const userTasks = result.rows;

    if (userTasks.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    return res.status(200).json(userTasks);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

// 3. GET ONE TASK: GET /api/tasks/:id
exports.show = async (req, res, next) => {
  try {
    // Convert the route parameter to a number.
    const taskId = Number(req.params?.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        message: "The task ID passed is not valid.",
      });
    }

    // Match both task ID and logged-in user's ID.
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [taskId, global.user_id]
    );

    const task = result.rows[0];

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

// 4. UPDATE TASK: PATCH /api/tasks/:id
exports.update = async (req, res, next) => {
  try {
    const { error, value } = patchTaskSchema.validate(
      req.body || {}
    );

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Validate the task ID.
    const taskId = Number(req.params?.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        message: "The task ID passed is not valid.",
      });
    }

    // Build the SQL update from the validated fields.
    const updates = [];
    const values = [];

    if (value.title !== undefined) {
      values.push(value.title);
      updates.push(`title = $${values.length}`);
    }

    if (value.isCompleted !== undefined) {
      values.push(value.isCompleted);
      updates.push(`is_completed = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    // Find the task belonging to the logged-in user.
    values.push(taskId);
    const taskIdPosition = values.length;

    values.push(global.user_id);
    const userIdPosition = values.length;

    const result = await pool.query(
      `UPDATE tasks
       SET ${updates.join(", ")}
       WHERE id = $${taskIdPosition}
         AND user_id = $${userIdPosition}
       RETURNING id, title, is_completed`,
      values
    );

    const task = result.rows[0];

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

// 5. DELETE TASK: DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    // Validate the task ID.
    const taskId = Number(req.params?.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        message: "The task ID passed is not valid.",
      });
    }

    // Find the task owned by this user and delete it.
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [taskId, global.user_id]
    );

    const deletedTask = result.rows[0];

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(deletedTask);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};
