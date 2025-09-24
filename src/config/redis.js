// Simple in-memory cache implementation
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  async set(key, value, ttl = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, value);

    // Set expiration timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      this.timers.set(key, timer);
    }

    return true;
  }

  async get(key) {
    return this.cache.get(key) || null;
  }

  async del(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  async exists(key) {
    return this.cache.has(key);
  }

  async mset(keyValuePairs, ttl = 3600) {
    for (const [key, value] of Object.entries(keyValuePairs)) {
      await this.set(key, value, ttl);
    }
    return true;
  }

  async mget(keys) {
    return keys.map((key) => this.cache.get(key) || null);
  }

  async incr(key, ttl = 3600) {
    const current = this.cache.get(key) || 0;
    const newValue = parseInt(current) + 1;
    await this.set(key, newValue, ttl);
    return newValue;
  }

  async hset(key, field, value, ttl = 3600) {
    const hash = this.cache.get(key) || {};
    hash[field] = value;
    await this.set(key, hash, ttl);
    return true;
  }

  async hget(key, field) {
    const hash = this.cache.get(key) || {};
    return hash[field] || null;
  }

  async hgetall(key) {
    return this.cache.get(key) || {};
  }

  async sadd(key, ...members) {
    const set = this.cache.get(key) || new Set();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    this.cache.set(key, set);
    return added;
  }

  async smembers(key) {
    const set = this.cache.get(key) || new Set();
    return Array.from(set);
  }

  async zadd(key, score, member) {
    const sortedSet = this.cache.get(key) || new Map();
    sortedSet.set(member, score);
    this.cache.set(key, sortedSet);
    return 1;
  }

  async zrange(key, start, stop, withScores = false) {
    const sortedSet = this.cache.get(key) || new Map();
    const entries = Array.from(sortedSet.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(start, stop + 1);

    if (withScores) {
      return entries.flat();
    }
    return entries.map(([member]) => member);
  }

  async flushall() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
    return true;
  }

  async info() {
    return {
      memory_usage: this.cache.size,
      connected_clients: 1,
      uptime_in_seconds: Math.floor(process.uptime()),
    };
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }
}

// Create memory cache instance
const memoryCache = new MemoryCache();

// Cache helper functions
export const cache = {
  // Set cache with expiration
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await memoryCache.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  },

  // Get cache
  async get(key) {
    try {
      const value = await memoryCache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  // Delete cache
  async del(key) {
    try {
      await memoryCache.del(key);
      return true;
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      return await memoryCache.exists(key);
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  },

  // Set multiple keys
  async mset(keyValuePairs, ttl = 3600) {
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        await memoryCache.set(key, serializedValue, ttl);
      }
      return true;
    } catch (error) {
      console.error("Cache mset error:", error);
      return false;
    }
  },

  // Get multiple keys
  async mget(keys) {
    try {
      const values = await memoryCache.mget(keys);
      return values.map((value) => (value ? JSON.parse(value) : null));
    } catch (error) {
      console.error("Cache mget error:", error);
      return [];
    }
  },

  // Increment counter
  async incr(key, ttl = 3600) {
    try {
      const result = await memoryCache.incr(key, ttl);
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
      await memoryCache.hset(key, field, serializedValue, ttl);
      return true;
    } catch (error) {
      console.error("Cache hset error:", error);
      return false;
    }
  },

  // Get hash field
  async hget(key, field) {
    try {
      const value = await memoryCache.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Cache hget error:", error);
      return null;
    }
  },

  // Get all hash fields
  async hgetall(key) {
    try {
      const hash = await memoryCache.hgetall(key);
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
      return await memoryCache.sadd(key, ...members);
    } catch (error) {
      console.error("Cache sadd error:", error);
      return 0;
    }
  },

  // Get set members
  async smembers(key) {
    try {
      return await memoryCache.smembers(key);
    } catch (error) {
      console.error("Cache smembers error:", error);
      return [];
    }
  },

  // Add to sorted set
  async zadd(key, score, member) {
    try {
      return await memoryCache.zadd(key, score, member);
    } catch (error) {
      console.error("Cache zadd error:", error);
      return 0;
    }
  },

  // Get sorted set range
  async zrange(key, start, stop, withScores = false) {
    try {
      return await memoryCache.zrange(key, start, stop, withScores);
    } catch (error) {
      console.error("Cache zrange error:", error);
      return [];
    }
  },

  // Flush all cache
  async flushall() {
    try {
      await memoryCache.flushall();
      return true;
    } catch (error) {
      console.error("Cache flushall error:", error);
      return false;
    }
  },

  // Get cache info
  async info() {
    try {
      return await memoryCache.info();
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

// Rate limiting with memory cache
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

// Connect to memory cache (no-op for compatibility)
export const connectRedis = async () => {
  console.log("🔧 Using Memory Cache (no Redis server needed)");
  return true;
};

export default memoryCache;
