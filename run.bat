@echo off
REM Run Memory Visualizer with sample trace

cd Memory-Management-Visualizer

if not exist "bin\memory_visualizer.exe" (
  echo Building first...
  g++ -std=c++17 -o bin/memory_visualizer.exe ^
    src/main.cpp ^
    src/simulator/MemoryManager.cpp ^
    src/simulator/FIFOReplacer.cpp ^
    src/simulator/Process.cpp ^
    src/io/TraceLoader.cpp ^
    src/ui/ConsoleView.cpp ^
    -I src
)

echo.
if "%1"=="" (
  echo Running with default sample trace...
  .\bin\memory_visualizer.exe traces/sample_trace.txt
) else (
  echo Running with custom trace: %1
  .\bin\memory_visualizer.exe %1
)

cd ..
pause
