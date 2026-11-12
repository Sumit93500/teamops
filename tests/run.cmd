@echo off
rem Runs the live suites in Asia/Kolkata, UTC and America/Los_Angeles and prints passed / failed (total) per area.
rem Needs Python 3.10+ and Node 22+. Arguments go to tools\run-tests.py: --react (also the React harnesses), --zones UTC, --only leave,store
python "%~dp0..\tools\run-tests.py" %*
