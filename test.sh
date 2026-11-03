#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p build/classes build/test
javac --release 21 --add-modules jdk.httpserver -encoding UTF-8 -d build/classes src/arena/*.java
javac --release 21 -encoding UTF-8 -cp 'build/classes:lib/*' -d build/test test/ChallengeTest.java
java -cp 'build/classes:build/test:lib/*' arena.ChallengeTest
python3 test/api_test.py
