
const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const prisma = require("../db/prisma");

// Build a safe sorting configuration from query parameters.
const getOrderBy = (query = {}) => {
  const validSortFields = [
    "title",
    "priority",
    "createdAt",
    "id",
    "isCompleted",
  ];

  const sortBy = query.sortBy || "createdAt";
  const sortDirection =
    query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }

  return { createdAt: "desc" };
};

// Convert Prisma's camelCase field to the existing API response format.
function formatTask(task) {
  return {
    id: task.id,
    title: task.title,
    isCompleted: task.isCompleted,
    createdAt: task.createdAt,
    priority: task.priority,
    ...(task.User && {
      User: {
        name: task.User.name,
        email: task.User.email,
      },
    }),
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
        priority: value.priority,
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
    // Read pagination parameters from the request.
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.max(1, Number(req.query?.limit) || 10);
    const skip = (page - 1) * limit;

    // Filter tasks by the logged-in user.
    const where = {
      userId: global.user_id,
    };

    // Optionally search task titles, ignoring letter case.
    if (req.query?.find) {
      where.title = {
        contains: req.query.find,
        mode: "insensitive",
      };
    }

    // Retrieve the total number of tasks for pagination.
    const total = await prisma.task.count({ where });

    // Retrieve the requested page with related user information.
    const userTasks = await prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: getOrderBy(req.query),
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate pagination metadata.
    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      tasks: userTasks.map(formatTask),
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    });
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
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
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
    if (value.priority !== undefined) {
      updates.priority = value.priority;
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
// 6. BULK CREATE TASKS: POST /api/tasks/bulk
exports.bulkCreate = async (req, res, next) => {
  try {
    const tasks = req.body?.tasks;

    // Ensure the request contains a non-empty array.
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        message: "A non-empty array of tasks is required.",
      });
    }

    const validTasks = [];

    // Validate every task before inserting anything.
    for (const task of tasks) {
      const { error, value } = taskSchema.validate(task);

      if (error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      validTasks.push({
        title: value.title,
        isCompleted: value.isCompleted,
        priority: value.priority,
        userId: global.user_id,
      });
    }

    // Insert all validated tasks in one database operation.
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

