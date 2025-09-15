import { logError } from "../config/logger.js";

// Mock Redis Service for development without Redis server
class MockRedis {
  constructor() {
    this.data = new Map();
    this.connected = true;
    console.log("🔧 Mock Redis initialized (no real Redis server needed)");
  }

  // Mock connection methods
  async connect() {
    this.connected = true;
    console.log("✅ Mock Redis connected");
    return this;
  }

  async disconnect() {
    this.connected = false;
    console.log("❌ Mock Redis disconnected");
  }

  // Mock Redis operations
  async get(key) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis GET: ${key} (disconnected)`);
      return null;
    }
    const value = this.data.get(key);
    console.log(`🔧 Mock Redis GET: ${key} = ${value ? "exists" : "null"}`);
    return value;
  }

  async set(key, value, options = {}) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis SET: ${key} (disconnected)`);
      return "OK";
    }

    this.data.set(key, value);

    // Handle expiration
    if (options.EX || options.ex) {
      const seconds = options.EX || options.ex;
      setTimeout(() => {
        this.data.delete(key);
        console.log(`🔧 Mock Redis EXPIRE: ${key} expired after ${seconds}s`);
      }, seconds * 1000);
    }

    console.log(`🔧 Mock Redis SET: ${key} = ${typeof value}`);
    return "OK";
  }

  async del(key) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis DEL: ${key} (disconnected)`);
      return 0;
    }
    const existed = this.data.has(key);
    this.data.delete(key);
    console.log(
      `🔧 Mock Redis DEL: ${key} (${existed ? "deleted" : "not found"})`
    );
    return existed ? 1 : 0;
  }

  async exists(key) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis EXISTS: ${key} (disconnected)`);
      return 0;
    }
    const exists = this.data.has(key);
    console.log(`🔧 Mock Redis EXISTS: ${key} = ${exists}`);
    return exists ? 1 : 0;
  }

  async expire(key, seconds) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis EXPIRE: ${key} (disconnected)`);
      return 0;
    }
    if (this.data.has(key)) {
      setTimeout(() => {
        this.data.delete(key);
        console.log(`🔧 Mock Redis EXPIRE: ${key} expired after ${seconds}s`);
      }, seconds * 1000);
      console.log(`🔧 Mock Redis EXPIRE: ${key} set to expire in ${seconds}s`);
      return 1;
    }
    console.log(`🔧 Mock Redis EXPIRE: ${key} not found`);
    return 0;
  }

  async ttl(key) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis TTL: ${key} (disconnected)`);
      return -2;
    }
    const exists = this.data.has(key);
    console.log(
      `🔧 Mock Redis TTL: ${key} = ${exists ? "no expiration" : "not found"}`
    );
    return exists ? -1 : -2; // -1 = no expiration, -2 = not found
  }

  async keys(pattern) {
    if (!this.connected) {
      console.log(`🔧 Mock Redis KEYS: ${pattern} (disconnected)`);
      return [];
    }
    const allKeys = Array.from(this.data.keys());
    const matchedKeys =
      pattern === "*"
        ? allKeys
        : allKeys.filter((key) => key.includes(pattern.replace("*", "")));
    console.log(`🔧 Mock Redis KEYS: ${pattern} = ${matchedKeys.length} keys`);
    return matchedKeys;
  }

  async flushall() {
    if (!this.connected) {
      console.log(`🔧 Mock Redis FLUSHALL (disconnected)`);
      return "OK";
    }
    this.data.clear();
    console.log(`🔧 Mock Redis FLUSHALL: cleared ${this.data.size} keys`);
    return "OK";
  }

  // Mock event emitters
  on(event, callback) {
    console.log(`🔧 Mock Redis ON: ${event}`);
    // Mock events for compatibility
    if (event === "connect") {
      setTimeout(() => callback(), 100);
    } else if (event === "ready") {
      setTimeout(() => callback(), 100);
    }
    return this;
  }

  off(event, callback) {
    console.log(`🔧 Mock Redis OFF: ${event}`);
    return this;
  }

  emit(event, ...args) {
    console.log(`🔧 Mock Redis EMIT: ${event}`, args);
    return this;
  }

  // Mock health check
  async ping() {
    if (!this.connected) {
      console.log(`🔧 Mock Redis PING (disconnected)`);
      return null;
    }
    console.log(`🔧 Mock Redis PING: PONG`);
    return "PONG";
  }

  // Mock info
  async info() {
    if (!this.connected) {
      console.log(`🔧 Mock Redis INFO (disconnected)`);
      return "Mock Redis - Disconnected";
    }
    const info = `Mock Redis - Connected
Keys: ${this.data.size}
Memory: Mock
Version: Mock-1.0.0`;
    console.log(`🔧 Mock Redis INFO: ${this.data.size} keys`);
    return info;
  }
}

// Create mock Redis instance
const mockRedis = new MockRedis();

// Mock Redis functions for compatibility
export const cache = {
  async get(key) {
    return await mockRedis.get(key);
  },

  async set(key, value, ttl = 3600) {
    return await mockRedis.set(key, value, { EX: ttl });
  },

  async del(key) {
    return await mockRedis.del(key);
  },

  async exists(key) {
    return await mockRedis.exists(key);
  },

  async flush() {
    return await mockRedis.flushall();
  },
};

export const rateLimiter = {
  async check(key, limit, window) {
    const current = await mockRedis.get(key);
    if (!current) {
      await mockRedis.set(key, 1, { EX: window });
      console.log(`🔧 Mock Rate Limiter: ${key} = 1/${limit}`);
      return { allowed: true, remaining: limit - 1 };
    }

    const count = parseInt(current);
    if (count >= limit) {
      console.log(`🔧 Mock Rate Limiter: ${key} = ${count}/${limit} (BLOCKED)`);
      return { allowed: false, remaining: 0 };
    }

    await mockRedis.set(key, count + 1, { EX: window });
    console.log(`🔧 Mock Rate Limiter: ${key} = ${count + 1}/${limit}`);
    return { allowed: true, remaining: limit - count - 1 };
  },
};

export const connectRedis = async () => {
  try {
    await mockRedis.connect();
    console.log("✅ Mock Redis connected successfully");
    return mockRedis;
  } catch (error) {
    logError.error("Mock Redis connection failed", { error: error.message });
    throw error;
  }
};

export { mockRedis };
export default mockRedis;
