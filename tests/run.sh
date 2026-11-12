#!/bin/sh
# Runs the live suites in Asia/Kolkata, UTC and America/Los_Angeles and prints passed / failed (total) per area.
# Needs Python 3.10+ and Node 22+. Arguments go to tools/run-tests.py: --react (also the React harnesses), --zones UTC, --only leave,store
exec python3 "$(dirname "$0")/../tools/run-tests.py" "$@"
