
const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  // Generate a 64-byte derived key.
  const derivedKey = await scrypt(password, salt, 64);

  // Store the salt and hash together.
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;

  const storedKey = Buffer.from(hash, "hex");

  if (storedKey.length !== 64) {
    return false;
  }

  const submittedKey = await scrypt(
    password,
    salt,
    storedKey.length
  );

  return crypto.timingSafeEqual(storedKey, submittedKey);
}

// REGISTER

async function register(req, res, next) {
  try {
    // Validate the request before storing user data.
    const { error, value } = userSchema.validate(
      req.body || {},
      { abortEarly: false }
    );

    if (error) {
      return res.status(400).json({
        message: error.message,
        details: error.details,
      });
    }

    const { name, email, password } = value;
    let result = null;

    // Hash the password before saving the user.
    const hashedPassword = await hashPassword(password);

    try {
      result = await pool.query(
        `INSERT INTO users (email, name, hashed_password)
         VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [email, name, hashedPassword]
      );
    } catch (error) {
      // PostgreSQL error 23505 means a UNIQUE constraint was violated.
      if (error.code === "23505") {
        return res.status(400).json({
          message: "Email already registered.",
        });
      }

      // Pass unexpected database errors to Express.
      if (typeof next === "function") {
        return next(error);
      }

      throw error;
    }

    const newUser = result.rows[0];

    // Store the user ID for task ownership checks.
    global.user_id = newUser.id;

    return res.status(201).json({
      name: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
}

// LOGON
async function logon(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" ||
        typeof password !== "string") {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Find the user in PostgreSQL  by email.
      const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    // Compare the password with the stored hash.
    const goodCredentials = user
      ? await comparePassword(password, user.hashed_password)
      : false;

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    global.user_id = user.id;

    return res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }
    throw error;
  }
}

// LOGOFF
function logoff(req, res, next) {
  try {
    global.user_id = null;

    return res.status(200).json({
      message: "User logged off successfully.",
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }
    throw error;
  }
}

module.exports = { register, logon, logoff };
