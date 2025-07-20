import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// If environment variable isn't loaded, use hardcoded connection string as fallback
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_rmefOwT71vgH@ep-aged-cake-a475j4co-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Configure the pool with SSL settings for Neon and connection retry
export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon database
  },
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('💥 Database pool error:', err);
  console.log('🔄 App will continue running with limited functionality');
});

export const db = drizzle(pool, { schema });