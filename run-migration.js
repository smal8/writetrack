import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function runMigration() {
  try {
    const migrationFile = process.argv[2] || '0002_add_writing_sessions.sql';
    const migrationPath = path.join('migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file ${migrationPath} not found`);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Running migration: ${migrationFile}`);
    
    // Split the SQL into individual statements and execute them one by one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql(statement);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 