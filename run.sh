#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p build/classes
javac --release 21 --add-modules jdk.httpserver -encoding UTF-8 -d build/classes src/arena/*.java
exec java --add-modules jdk.httpserver -cp "build/classes:lib/*" arena.WebServer
