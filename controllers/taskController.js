
const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

// Generate unique sequential task IDs.
const taskCounter = (() => {
  let lastTaskNumber = 0;

  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

// Remove userId before returning task data to the client.
const sanitizeTask = (task) => {
  const { userId, ...sanitizedTask } = task;
  return sanitizedTask;
};

// 1. CREATE TASK: POST /api/tasks
exports.create = async (req, res, next) => {
  try {
    const { error, value } = taskSchema.validate(req.body || {});

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    const newTask = {
      id: taskCounter(),
      userId: global.user_id.email,
      ...value,
    };

    // Save the task in temporary memory.
    global.tasks.push(newTask);

    return res.status(201).json(sanitizeTask(newTask));
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
    const userTasks = global.tasks.filter(
      (task) => task.userId === global.user_id.email
    );

    if (userTasks.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    // Remove userId from each task in the response.
    const sanitizedTasks = userTasks.map(sanitizeTask);

    return res.status(200).json(sanitizedTasks);
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

    // Match both task ID and logged-in user's email.
    const task = global.tasks.find(
      (task) =>
        task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(sanitizeTask(task));
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

    // Find the task belonging to the logged-in user.
    const task = global.tasks.find(
      (task) =>
        task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }


    Object.assign(task, value);

    return res.status(200).json(sanitizeTask(task));
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

    // Find the position of the task owned by this user.
    const taskIndex = global.tasks.findIndex(
      (task) =>
        task.id === taskId &&
        task.userId === global.user_id.email
    );

    if (taskIndex === -1) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    // Remove the task from the array.
    const [deletedTask] = global.tasks.splice(taskIndex, 1);

    return res.status(200).json(sanitizeTask(deletedTask));
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }
    throw error;
  }
};
