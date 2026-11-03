@echo off
cd /d "%~dp0"
if not exist build\classes mkdir build\classes
javac --release 21 --add-modules jdk.httpserver -encoding UTF-8 -d build\classes src\arena\*.java
if errorlevel 1 (pause & exit /b 1)
java --add-modules jdk.httpserver -cp "build\classes;lib\*" arena.WebServer
pause
