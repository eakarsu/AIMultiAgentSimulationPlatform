#!/bin/bash
cd "$(dirname "$0")"
echo "🎮 Starting AI Multi-Agent Simulation Platform..."

# Kill ports
for port in 3012 3013; do
  pid=$(lsof -ti:$port 2>/dev/null)
  [ -n "$pid" ] && kill -9 $pid 2>/dev/null && echo "Killed process on port $port"
done

# Create DB
createdb ai_simulation_db 2>/dev/null || true

# Install deps
cd backend && npm install 2>/dev/null
cd ../frontend && npm install 2>/dev/null
cd ..

# Run schema & seed
psql -d ai_simulation_db -f backend/models/schema.sql 2>/dev/null
node backend/seeds/seed.js

# Start backend with nodemon
cd backend && npx nodemon server.js &
cd ..

# Start frontend
cd frontend && PORT=3013 npm start &

echo "✅ Backend: http://localhost:3012 | Frontend: http://localhost:3013"
wait
