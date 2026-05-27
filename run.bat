@echo off
title SavorShield - Fruit Classification Web Application
echo ==========================================================
echo               SAVORSHIELD FLASK ENVIRONMENT SETUP
echo ==========================================================
echo Checking and installing missing dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Pip installation encountered an issue. Let's make sure requirements are satisfied...
    pip install Flask pillow numpy tensorflow
)

echo.
echo ==========================================================
echo                   STARTING FLASK SERVER
echo ==========================================================
echo Server launching on http://localhost:5000
echo Keep this window open while using SavorShield!
echo ==========================================================
echo.
python app.py
pause
