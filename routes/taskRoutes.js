
const express = require("express");
const router = express.Router();

const {
  create,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

// Create a new task.
router.post("/", create);

// Retrieve all tasks belonging to the logged-in user.
router.get("/", index);

// Retrieve one task by its ID.
router.get("/:id", show);

// Update selected fields of an existing task.
router.patch("/:id", update);

// Delete a task.
router.delete("/:id", deleteTask);

module.exports = router;
