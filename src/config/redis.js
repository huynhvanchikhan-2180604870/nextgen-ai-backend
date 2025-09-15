import Redis from "ioredis";
import {
  cache as mockCache,
  connectRedis as mockConnectRedis,
  mockRedis,
} from "../services/mockRedisService.js";

// Check if we have real Redis credentials
const hasRealRedis =
  process.env.REDIS_URL &&
  process.env.REDIS_URL !== "redis://localhost:6379" &&
  !process.env.REDIS_URL.includes("localhost");

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client (only if we have real Redis)
let redis = null;
if (hasRealRedis) {
  redis = new Redis(redisConfig);
} else {
  console.log("🔧 Using Mock Redis (no real Redis server needed)");
}

// Redis event handlers (only for real Redis)
if (hasRealRedis && redis) {
  redis.on("connect", () => {
    console.log("🔴 Redis connected successfully");
  });

  redis.on("error", (error) => {
    console.error("Redis connection error:", error);
  });

  redis.on("close", () => {
    console.log("Redis connection closed");
  });

  redis.on("reconnecting", () => {
    console.log("Redis reconnecting...");
  });
}

// Cache helper functions
export const cache = {
  // Set cache with expiration
  async set(key, value, ttl = 3600) {
    if (!hasRealRedis) {
      return await mockCache.set(key, value, ttl);
    }

    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  },

  // Get cache
  async get(key) {
    if (!hasRealRedis) {
      return await mockCache.get(key);
    }

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  // Delete cache
  async del(key) {
    if (!hasRealRedis) {
      return await mockCache.del(key);
    }

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  },

  // Set multiple keys
  async mset(keyValuePairs, ttl = 3600) {
    try {
      const pipeline = redis.pipeline();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, ttl, serializedValue);
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error("Cache mset error:", error);
      return false;
    }
  },

  // Get multiple keys
  async mget(keys) {
    try {
      const values = await redis.mget(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error("Cache mget error:", error);
      return [];
    }
  },

  // Increment counter
  async incr(key, ttl = 3600) {
    try {
      const result = await redis.incr(key);
      if (result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error("Cache incr error:", error);
      return 0;
    }
  },

  // Set hash field
  async hset(key, field, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.hset(key, field, serializedValue);
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error("Cache hset error:", error);
      return false;
    }
  },

  // Get hash field
  async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache hget error:", error);
      return null;
    }
  },

  // Get all hash fields
  async hgetall(key) {
    try {
      const hash = await redis.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error("Cache hgetall error:", error);
      return {};
    }
  },

  // Add to set
  async sadd(key, ...members) {
    try {
      return await redis.sadd(key, ...members);
    } catch (error) {
      console.error("Cache sadd error:", error);
      return 0;
    }
  },

  // Get set members
  async smembers(key) {
    try {
      return await redis.smembers(key);
    } catch (error) {
      console.error("Cache smembers error:", error);
      return [];
    }
  },

  // Add to sorted set
  async zadd(key, score, member) {
    try {
      return await redis.zadd(key, score, member);
    } catch (error) {
      console.error("Cache zadd error:", error);
      return 0;
    }
  },

  // Get sorted set range
  async zrange(key, start, stop, withScores = false) {
    try {
      const args = [key, start, stop];
      if (withScores) args.push("WITHSCORES");
      return await redis.zrange(...args);
    } catch (error) {
      console.error("Cache zrange error:", error);
      return [];
    }
  },

  // Flush all cache
  async flushall() {
    try {
      await redis.flushall();
      return true;
    } catch (error) {
      console.error("Cache flushall error:", error);
      return false;
    }
  },

  // Get cache info
  async info() {
    try {
      return await redis.info();
    } catch (error) {
      console.error("Cache info error:", error);
      return null;
    }
  },
};

// Cache key generators
export const cacheKeys = {
  user: (id) => `user:${id}`,
  project: (id) => `project:${id}`,
  projects: (filters) => `projects:${JSON.stringify(filters)}`,
  featuredProjects: () => "projects:featured",
  filterOptions: () => "projects:filter-options",
  userVault: (userId) => `user:${userId}:vault`,
  userFavorites: (userId) => `user:${userId}:favorites`,
  userBalance: (userId) => `user:${userId}:balance`,
  aiSession: (sessionId) => `ai:session:${sessionId}`,
  searchSuggestions: (query) => `search:suggestions:${query}`,
  stats: () => "stats:overview",
  rateLimit: (ip, endpoint) => `rate_limit:${ip}:${endpoint}`,
  otp: (email) => `otp:${email}`,
  session: (sessionId) => `session:${sessionId}`,
};

// Cache middleware
export const cacheMiddleware = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    try {
      const key =
        typeof keyGenerator === "function" ? keyGenerator(req) : keyGenerator;
      const cachedData = await cache.get(key);

      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = function (data) {
        // Cache the response
        if (data.success && data.data) {
          cache.set(key, data.data, ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
};

// Rate limiting with Redis
export const rateLimit = {
  async checkLimit(identifier, limit, window) {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await cache.incr(key, window);

      if (current > limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + window * 1000,
        };
      }

      return {
        allowed: true,
        remaining: limit - current,
        resetTime: Date.now() + window * 1000,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + window * 1000,
      };
    }
  },

  async resetLimit(identifier) {
    try {
      const key = `rate_limit:${identifier}`;
      await cache.del(key);
      return true;
    } catch (error) {
      console.error("Rate limit reset error:", error);
      return false;
    }
  },
};

// Connect to Redis
export const connectRedis = async () => {
  if (!hasRealRedis) {
    return await mockConnectRedis();
  }

  try {
    await redis.connect();
    console.log("🔴 Redis connected successfully");
  } catch (error) {
    console.error("Redis connection error:", error);
  }
};

export default hasRealRedis ? redis : mockRedis;
