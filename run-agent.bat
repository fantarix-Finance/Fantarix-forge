@echo off
set "VENV_PYTHON=C:\Users\hojin.kim\.gemini\antigravity\playground\polar-meteor\venv\Scripts\python.exe"
set "AGENT_SCRIPT=C:\Users\hojin.kim\.gemini\antigravity\playground\polar-meteor\dev_team.py"

echo [Agent Bridge] Forwarding command to MetaGPT...
"%VENV_PYTHON%" "%AGENT_SCRIPT%" %*
