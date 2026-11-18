const prisma = require("../db/prisma");

// 1. GET USER ANALYTICS: GET /api/analytics/users/:id
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const userId = Number(req.params?.id);

    // Validate the user ID.
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    // Verify that the user exists.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Group tasks by their completion status.
    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // Retrieve the 10 most recently created tasks.
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate task activity for the last seven days.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress,
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};

// 2. GET USERS WITH TASK STATISTICS: GET /api/analytics/users
exports.getUsersWithStats = async (req, res, next) => {
  try {
    // Read pagination parameters.
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.max(1, Number(req.query?.limit) || 10);
    const skip = (page - 1) * limit;

    // Retrieve users, their task counts, and up to 5 incomplete tasks.
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Return only safe user fields.
    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    // Calculate pagination metadata.
    const total = await prisma.user.count();
    const pages = Math.ceil(total / limit);

    return res.status(200).json({
      users,
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
// 3. SEARCH TASKS USING RAW SQL: GET /api/analytics/tasks/search
exports.searchTasks = async (req, res, next) => {
  try {
    const searchQuery =
      typeof req.query?.q === "string"
        ? req.query.q.trim()
        : "";

    // Require at least two characters.
    if (searchQuery.length < 2) {
      return res.status(400).json({
        message: "Search query must contain at least 2 characters.",
      });
    }

    // Limit the number of search results.
    const requestedLimit = Number(req.query?.limit);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;

    const searchPattern = `%${searchQuery}%`;
    const prefixPattern = `${searchQuery}%`;

    // Use parameterized SQL through Prisma to prevent SQL injection.
    const searchResults = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed AS "isCompleted",
        t.priority,
        t.created_at AS "createdAt",
        t.user_id AS "userId",
        u.name AS "user_name"
      FROM tasks t
      INNER JOIN users u ON t.user_id = u.id
      WHERE
        t.title ILIKE ${searchPattern}
        OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN LOWER(t.title) = LOWER(${searchQuery}) THEN 1
          WHEN t.title ILIKE ${prefixPattern} THEN 2
          ELSE 3
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    return res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }

    throw error;
  }
};