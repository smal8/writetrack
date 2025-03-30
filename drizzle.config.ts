import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use hardcoded DATABASE_URL as fallback
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rmefOwT71vgH@ep-aged-cake-a475j4co-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
