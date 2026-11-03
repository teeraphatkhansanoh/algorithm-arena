#!/bin/sh
cd "$(dirname "$0")"
sh run.sh
status=$?
if [ "$status" -ne 0 ]; then
 printf '\nUnable to start. Check that JDK 21+ is installed and port 8080 is available.\n'
 printf 'Press Enter to close.'
 read answer
fi
exit "$status"
