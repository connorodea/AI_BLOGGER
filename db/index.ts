import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const createDbConnection = async (retries = MAX_RETRIES) => {
  try {
    return drizzle({
      connection: process.env.DATABASE_URL,
      schema,
      ws: ws,
    });
  } catch (error) {
    if (retries > 0) {
      console.log(`Database connection failed, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return createDbConnection(retries - 1);
    }
    throw error;
  }
};

export const db = await createDbConnection();
