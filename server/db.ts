import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// If environment variable isn't loaded, use hardcoded connection string as fallback
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rmefOwT71vgH@ep-aged-cake-a475j4co-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Configure the pool with SSL settings for Neon
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon database
  }
});

export const db = drizzle(pool, { schema });