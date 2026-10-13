/**
 * MongoDB connection helper.
 * Caches the connection on `global` so Next.js hot reloads and serverless
 * invocations reuse one connection instead of opening a new one each time.
 */
import mongoose from "mongoose";

const DB_NAME = "lanka-card-deals";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function dbConnect(): Promise<typeof mongoose> {
  // Read at call time — env vars may be missing while `next build` evaluates modules.
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  if (cache.conn) return cache.conn;

  cache.promise ??= mongoose.connect(uri, {
    dbName: DB_NAME,
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // allow a retry on the next call
    throw err;
  }
  return cache.conn;
}

export async function dbDisconnect(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
