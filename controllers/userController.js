
const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

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
      });
    }

    const { name, email, password } = value;

    // Prevent duplicate email registrations.
    const existingUser = global.users.find(
      (user) => user.email === email
    );

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered.",
      });
    }

    // Hash the password before saving the user.
    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: global.users.length + 1,
      name,
      email,
      hashedPassword,
    };

    global.users.push(newUser);

    // Store the user object for task ownership checks.
    global.user_id = newUser;

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

    // Find the user by email.
    const user = global.users.find(
      (u) => u.email === email.trim().toLowerCase()
    );

    // Compare the password with the stored hash.
    const goodCredentials = user
      ? await comparePassword(password, user.hashedPassword)
      : false;

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    global.user_id = user;

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
