#!/bin/bash

# PulseMeet One-Click Startup Script

echo "🚀 Starting PulseMeet Video Conferencing Platform..."

# 1. Verify XAMPP MySQL is active
if /Applications/XAMPP/xamppfiles/bin/mysqladmin ping -u root 2>/dev/null; then
    echo "✅ XAMPP MySQL is running."
else
    echo "⚠️ Starting XAMPP MySQL..."
    /Applications/XAMPP/xamppfiles/bin/mysql.server start 2>/dev/null || true
fi

# 2. Kill any stale processes on ports 5001 and 5173 if needed
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 3. Start Backend
echo "📡 Starting Backend API on http://localhost:5001..."
cd /Applications/XAMPP/xamppfiles/htdocs/meet/backend
npm run dev &
BACKEND_PID=$!

# 4. Start Frontend
echo "💻 Starting Frontend App on http://localhost:5173..."
cd /Applications/XAMPP/xamppfiles/htdocs/meet/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 PulseMeet is running!"
echo "👉 Open your browser at: http://localhost:5173"
echo "👉 Backend API running at: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
