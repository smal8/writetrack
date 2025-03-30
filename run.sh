#!/bin/bash

# Kill any existing server instances
pkill -f 'tsx server/index.ts' || echo "No server was running"

# Set the environment variables and start the server
export DATABASE_URL="postgresql://neondb_owner:npg_rmefOwT71vgH@ep-aged-cake-a475j4co-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
export SESSION_SECRET="your_secure_session_secret_replace_in_production"
export NODE_ENV="development"

# Start the server
echo "Starting WriteTrack server..."
tsx server/index.ts

# Keep this terminal open
exec $SHELL 