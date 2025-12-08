@echo off
echo Starting Memory Management Visualizer...
echo.

REM Start backend
echo Starting backend on port 3001...
start "Backend" cmd /k "cd backend && npm install && npm run dev"

REM Start frontend
echo Starting frontend on port 5173...
timeout /t 3
start "Frontend" cmd /k "cd memory-viz-web && npm install && npm run dev"

echo.
echo Both services starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
