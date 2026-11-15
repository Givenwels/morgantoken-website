@echo off
cd /d %~dp0
python scripts\01_validate.py || goto :fail
python scripts\02_clean.py || goto :fail
python scripts\03_merge.py || goto :fail
python scripts\04_stats.py || goto :fail
python scripts\05_report.py || goto :fail
echo PIPELINE OK
exit /b 0
:fail
echo PIPELINE FAILED
exit /b 1
