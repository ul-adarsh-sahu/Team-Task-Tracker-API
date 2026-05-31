const redis = require("redis");

let client = null;

const getRedisClient = async () => {
  if (!client) {
    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on("connect", () => console.log("Redis connected"));
    client.on("error", (err) => console.error("Redis error:", err.message));

    await client.connect();
  }
  return client;
};

const cacheGet = async (key) => {
  try {
    const c = await getRedisClient();
    const data = await c.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("cacheGet error:", err.message);
    return null;
  }
};

const cacheSet = async (key, data, ttlSeconds = 300) => {
  try {
    const c = await getRedisClient();
    await c.set(key, JSON.stringify(data), { EX: ttlSeconds });
  } catch (err) {
    console.error("cacheSet error:", err.message);
  }
};

const cacheDel = async (...keys) => {
  try {
    if (!keys.length) return;
    const c = await getRedisClient();
    await c.del(keys);
  } catch (err) {
    console.error("cacheDel error:", err.message);
  }
};

/**
 * Delete all keys matching a glob pattern.
 * e.g. cacheDelPattern("tasks:assignee:abc123:*")
 */
const cacheDelPattern = async (pattern) => {
  try {
    const c = await getRedisClient();
    const keys = await c.keys(pattern);
    if (keys.length) await c.del(keys);
  } catch (err) {
    console.error("cacheDelPattern error:", err.message);
  }
};

module.exports = { getRedisClient, cacheGet, cacheSet, cacheDel, cacheDelPattern };
