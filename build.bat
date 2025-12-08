@echo off
REM Compile Memory Visualizer with MSVC
REM Make sure you have Visual Studio installed

cd Memory-Management-Visualizer

REM Create build directory
if not exist "build" mkdir build
cd build

REM Run cmake with Visual Studio generator
cmake -G "Visual Studio 17 2022" ..

REM Build the project
cmake --build . --config Release

cd ..
echo.
echo Build complete! Executable: build\Release\memory_visualizer.exe
echo.
echo To run with sample trace:
echo   .\build\Release\memory_visualizer.exe traces/sample_trace.txt
pause
