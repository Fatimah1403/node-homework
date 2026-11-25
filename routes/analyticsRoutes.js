const express = require("express");
const router = express.Router();

const {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
} = require("../controllers/analyticsController");

// Get statistics for all users with pagination.
router.get("/users", getUsersWithStats);

// Get analytics for one user.
router.get("/users/:id", getUserAnalytics);

// Search tasks using raw SQL.
router.get("/tasks/search", searchTasks);

module.exports = router;