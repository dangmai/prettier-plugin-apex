@echo off

REM Script to run prettier apex on real world project. It takes 1 argument:
REM - Path to directory contains Apex Code
start /b node "%~dp0..\tests_config\set_up.js"
cmd /c prettier --plugin="%~dp0.." --server-auto-start=false --write "%1/**/*.{trigger,cls}"
node "%~dp0..\tests_config\tear_down.js"
