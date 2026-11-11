
const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const prisma = require("../db/prisma");

// Convert Prisma's camelCase field to the existing API response format.
function formatTask(task) {
  return {
    id: task.id,
    title: task.title,
    isCompleted: task.isCompleted,
  };
}

// 1. CREATE TASK: POST /api/tasks
exports.create = async (req, res, next) => {
  try {
    const { error, value } = taskSchema.validate(req.body || {});

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    // Save the task in PostgreSQL through Prisma.
    const newTask = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
    });

    return res.status(201).json(formatTask(newTask));
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
    const userTasks = await prisma.task.findMany({
      where: {
        userId: global.user_id,
      },
    });

    if (userTasks.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    return res.status(200).json(userTasks.map(formatTask));
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
    const task = await prisma.task.findUnique({
      where: {
        id_userId: {
          id: taskId,
          userId: global.user_id,
        },
      },
  });

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(formatTask(task));
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

    // Build the Prisma update from the validated fields.
    const updates = {};

    if (value.title !== undefined) {
      updates.title = value.title;
    }

    if (value.isCompleted !== undefined) {
      updates.isCompleted = value.isCompleted;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    try {
      // Update only the task belonging to the logged-in user.
      const task = await prisma.task.update({
        where: {
          id_userId: {
            id: taskId,
            userId: global.user_id,
          },
        },
        data: updates,
      });

      return res.status(200).json(formatTask(task));
    } catch (error) {
      // P2025 means no matching record was found.
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Task not found.",
        });
      }

      throw error;
    }
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

    try {
      // Delete only the task belonging to the logged-in user.
      const deletedTask = await prisma.task.delete({
        where: {
          id_userId: {
            id: taskId,
            userId: global.user_id,
          },
        },
      });

      return res.status(200).json(formatTask(deletedTask));
    } catch (error) {
      // P2025 means the task does not exist or belongs to another user.
      if (error.code === "P2025") {
        return res.status(404).json({
          message: "Task not found.",
        });
      }

      throw error;
    }
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

