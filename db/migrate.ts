
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  
  await migrate(db, { migrationsFolder: "./migrations" });
  
  console.log("Migrations completed!");
  
  await sql.end();
};

runMigrations().catch((err) => {
  console.error("Migration failed!", err);
  process.exit(1);
});
