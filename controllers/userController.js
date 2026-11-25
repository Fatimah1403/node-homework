
const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");
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

    // Hash the password before starting the transaction.
    const hashedPassword = await hashPassword(password);

    // Create the user and welcome tasks as one atomic operation.
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Define the three welcome tasks.
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          priority: "medium",
          userId: newUser.id,
        },
        {
          title: "Add your first task",
          priority: "high",
          userId: newUser.id,
        },
        {
          title: "Explore the app",
          priority: "low",
          userId: newUser.id,
        },
      ];

      // Insert all three tasks in the same transaction.
      await tx.task.createMany({
        data: welcomeTaskData,
      });

      // Retrieve the created welcome tasks.
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          priority: true,
          userId: true,
        },
      });

      return {
        user: newUser,
        welcomeTasks,
      };
    });

    // Store the user ID only after the transaction succeeds.
    global.user_id = result.user.id;

    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (error) {
    // Prisma P2002 means a unique constraint was violated.
    if (error.code === "P2002") {
      return res.status(400).json({
        message: "Email already registered.",
      });
    }

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
    const user = await prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    // Compare the password with the stored hash.
    const goodCredentials = user
      ? await comparePassword(password, user.hashedPassword)
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
