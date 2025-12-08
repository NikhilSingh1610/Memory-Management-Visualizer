@echo off
REM Compile Memory Visualizer with g++

cd Memory-Management-Visualizer

REM Create output directory
if not exist "bin" mkdir bin

echo Compiling Memory Visualizer...
g++ -std=c++17 -o bin/memory_visualizer.exe ^
  src/main.cpp ^
  src/simulator/MemoryManager.cpp ^
  src/simulator/FIFOReplacer.cpp ^
  src/simulator/Process.cpp ^
  src/io/TraceLoader.cpp ^
  src/ui/ConsoleView.cpp ^
  -I src

echo.
if exist "bin\memory_visualizer.exe" (
  echo Build successful!
  echo.
  echo Executable: Memory-Management-Visualizer\bin\memory_visualizer.exe
  echo.
  echo Running with sample trace...
  .\bin\memory_visualizer.exe ..\traces\sample_trace.txt
) else (
  echo Build failed!
)

cd ..
pause
