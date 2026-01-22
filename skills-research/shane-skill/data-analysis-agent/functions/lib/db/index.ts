import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// Drizzle client (for typed SQL queries)
const connectionString = process.env.DATABASE_URL!;

// For serverless environments, use connection pooling
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for serverless
  max: 1, // Single connection for serverless
});

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from "./schema.js";
