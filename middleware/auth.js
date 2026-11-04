// middleware/auth.js
// Protects task routes — checks if a user is logged in before the controller runs
// Returns 401 immediately if no user is logged in - does NOT call next()

module.exports = (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};