import cron from "node-cron";
import { logError } from "../config/logger.js";
import { cache } from "../config/redis.js";
import AIPlannerSession from "../models/AIPlannerSession.js";
import Notification from "../models/Notification.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

// Cleanup expired AI sessions every hour
cron.schedule("0 * * * *", async () => {
  try {
    console.log("🧹 Cleaning up expired AI sessions...");
    const result = await AIPlannerSession.cleanupExpired();
    console.log(`✅ Cleaned up ${result.modifiedCount} expired AI sessions`);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to cleanup expired AI sessions:", error);
  }
});

// Cleanup expired notifications every day at 2 AM
cron.schedule("0 2 * * *", async () => {
  try {
    console.log("🧹 Cleaning up expired notifications...");
    const result = await Notification.cleanupExpired();
    console.log(`✅ Cleaned up ${result.deletedCount} expired notifications`);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to cleanup expired notifications:", error);
  }
});

// Update project statistics every day at 3 AM
cron.schedule("0 3 * * *", async () => {
  try {
    console.log("📊 Updating project statistics...");

    // Update project ratings
    const projects = await Project.find({ "reviews.0": { $exists: true } });

    for (const project of projects) {
      await project.updateRating();
    }

    console.log(`✅ Updated ratings for ${projects.length} projects`);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to update project statistics:", error);
  }
});

// Cleanup inactive users every week on Sunday at 4 AM
cron.schedule("0 4 * * 0", async () => {
  try {
    console.log("🧹 Cleaning up inactive users...");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const inactiveUsers = await User.find({
      lastLogin: { $lt: sixMonthsAgo },
      verified: false,
      role: "user",
    });

    // Mark as inactive instead of deleting
    await User.updateMany(
      {
        _id: { $in: inactiveUsers.map((u) => u._id) },
      },
      {
        $set: { isActive: false },
      }
    );

    console.log(`✅ Marked ${inactiveUsers.length} inactive users`);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to cleanup inactive users:", error);
  }
});

// Clear Redis cache every day at 5 AM
cron.schedule("0 5 * * *", async () => {
  try {
    console.log("🧹 Clearing Redis cache...");

    // Clear old cache entries (keep recent ones)
    const keys = await cache.redis.keys("*");
    const oldKeys = keys.filter((key) => {
      // Clear cache older than 24 hours
      return key.includes(":") && !key.includes("session:");
    });

    if (oldKeys.length > 0) {
      await cache.redis.del(...oldKeys);
      console.log(`✅ Cleared ${oldKeys.length} old cache entries`);
    }
  } catch (error) {
    logError(error);
    console.error("❌ Failed to clear Redis cache:", error);
  }
});

// Generate daily reports every day at 6 AM
cron.schedule("0 6 * * *", async () => {
  try {
    console.log("📈 Generating daily reports...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get daily stats
    const [newUsers, newProjects, newPurchases, totalRevenue] =
      await Promise.all([
        User.countDocuments({
          createdAt: { $gte: yesterday, $lt: today },
        }),
        Project.countDocuments({
          createdAt: { $gte: yesterday, $lt: today },
        }),
        // This would need to be implemented based on your transaction model
        // Transaction.countDocuments({
        //   type: "purchase",
        //   createdAt: { $gte: yesterday, $lt: today },
        //   status: "completed",
        // }),
        // Transaction.aggregate([
        //   {
        //     $match: {
        //       type: "purchase",
        //       createdAt: { $gte: yesterday, $lt: today },
        //       status: "completed",
        //     },
        //   },
        //   { $group: { _id: null, total: { $sum: "$amount" } } },
        // ]),
      ]);

    const report = {
      date: yesterday.toISOString().split("T")[0],
      newUsers,
      newProjects,
      newPurchases: 0, // Placeholder
      totalRevenue: 0, // Placeholder
    };

    // Store report in cache
    await cache.set(`daily_report:${report.date}`, report, 7 * 24 * 60 * 60); // 7 days

    console.log("✅ Daily report generated:", report);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to generate daily reports:", error);
  }
});

// Health check every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    // Check database connection
    await User.findOne().limit(1);

    // Check Redis connection
    await cache.get("health_check");
    await cache.set("health_check", Date.now(), 60);

    console.log("💚 Health check passed");
  } catch (error) {
    logError(error);
    console.error("❌ Health check failed:", error);
  }
});

// Backup important data every day at 1 AM
cron.schedule("0 1 * * *", async () => {
  try {
    console.log("💾 Starting data backup...");

    // Backup user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: { $sum: { $cond: ["$verified", 1, 0] } },
          activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
        },
      },
    ]);

    // Backup project statistics
    const projectStats = await Project.aggregate([
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          publishedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          totalRevenue: { $sum: { $multiply: ["$price", "$purchaseCount"] } },
        },
      },
    ]);

    const backup = {
      timestamp: new Date(),
      userStats: userStats[0] || {},
      projectStats: projectStats[0] || {},
    };

    // Store backup in cache
    await cache.set("daily_backup", backup, 30 * 24 * 60 * 60); // 30 days

    console.log("✅ Data backup completed");
  } catch (error) {
    logError(error);
    console.error("❌ Failed to backup data:", error);
  }
});

// Send weekly newsletter every Monday at 9 AM
cron.schedule("0 9 * * 1", async () => {
  try {
    console.log("📧 Sending weekly newsletter...");

    // Get active users who want to receive newsletters
    const users = await User.find({
      isActive: true,
      verified: true,
      "preferences.notifications.email": true,
      "preferences.notifications.promotions": true,
    }).select("email fullName");

    // Get featured projects from last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const featuredProjects = await Project.find({
      featured: true,
      status: "published",
      createdAt: { $gte: lastWeek },
    })
      .select("title description thumbnail price")
      .limit(5);

    const newsletterData = {
      title: "NextGenAI Weekly Newsletter",
      content: "Discover the latest projects and updates from NextGenAI!",
      featuredProjects,
      totalUsers: users.length,
    };

    // Send newsletter to users (in batches to avoid rate limiting)
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const promises = batch.map((user) =>
        // This would use your email service
        // emailService.sendNewsletterEmail(user.email, user.fullName, newsletterData)
        Promise.resolve()
      );

      await Promise.all(promises);

      // Wait 1 second between batches
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Weekly newsletter sent to ${users.length} users`);
  } catch (error) {
    logError(error);
    console.error("❌ Failed to send weekly newsletter:", error);
  }
});

// Cleanup old logs every month on the 1st at 7 AM
cron.schedule("0 7 1 * *", async () => {
  try {
    console.log("🧹 Cleaning up old logs...");

    // This would clean up old log files
    // In a real implementation, you might want to:
    // 1. Archive old logs
    // 2. Delete logs older than a certain period
    // 3. Compress old logs

    console.log("✅ Log cleanup completed");
  } catch (error) {
    logError(error);
    console.error("❌ Failed to cleanup logs:", error);
  }
});

console.log("⏰ Cron jobs initialized successfully");

export default {
  // Export individual job functions for testing
  cleanupExpiredSessions: () => AIPlannerSession.cleanupExpired(),
  cleanupExpiredNotifications: () => Notification.cleanupExpired(),
  updateProjectStatistics: async () => {
    const projects = await Project.find({ "reviews.0": { $exists: true } });
    for (const project of projects) {
      await project.updateRating();
    }
    return projects.length;
  },
  generateDailyReport: async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: yesterday, $lt: today },
    });

    return { date: yesterday.toISOString().split("T")[0], newUsers };
  },
};
