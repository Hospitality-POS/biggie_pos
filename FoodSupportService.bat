@echo off

:: Define the paths to your frontend and backend directories
set "FRONTEND_DIR=C:\FSS\biggie_pos"
set "BACKEND_DIR=C:\FSS\biggie_api"

:: Define the commands to start the frontend and backend servers
set "FRONTEND_COMMAND=npm run preview"  REM Replace with your frontend start command
set "BACKEND_COMMAND=npm start"   REM Replace with your backend start command

:: Start the frontend server in a new command prompt window
start cmd /k "cd /d %FRONTEND_DIR% && %FRONTEND_COMMAND%"

:: Start the backend server in a new command prompt window
start cmd /k "cd /d %BACKEND_DIR% && %BACKEND_COMMAND%"

:: Print a message indicating that both servers are running
echo Frontend and Backend servers are now running.

:: Pause to keep the batch script open (press any key to exit)
pause
