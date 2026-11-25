const express = require("express");

const {
    register,
    logon,
    logoff,
} = require("../controllers/userController");

const jwtMiddleware = require("../middleware/jwtMiddleware");


const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/logon", logon);

// Protected route
router.post("/logoff", jwtMiddleware, logoff);

module.exports = router;