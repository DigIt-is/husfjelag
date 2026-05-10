#!/bin/bash
# Start backend and frontend for local development.
#
# Prerequisites:
#   brew install dopplerhq/cli/doppler
#   doppler login
#   cd HusfelagPy && doppler setup   # select project + config (run once per machine)
#
# Doppler injects BUNADARSKILRIKI, BUNADARSKILRIKI_PWD, and all other secrets
# into the backend process. Non-secret local config still comes from HusfelagPy/.env.

trap 'kill 0' EXIT

# Check if Doppler is configured for this directory.
if (cd HusfelagPy && doppler configure get project 2>/dev/null | grep -qv "^$"); then
  RUN="doppler run --"
  echo "Doppler configured — secrets injected from Doppler."
else
  RUN=""
  echo "Warning: Doppler not configured. Run these once per machine:"
  echo "  doppler login"
  echo "  cd HusfelagPy && doppler setup"
  echo "Falling back to .env only (BUNADARSKILRIKI will not be available)."
fi

echo "Running migrations..."
(cd HusfelagPy && $RUN poetry run python3 manage.py migrate)

echo "Starting backend on http://localhost:8010 ..."
(cd HusfelagPy && $RUN poetry run python3 manage.py runserver 8010) &

echo "Waiting for backend to be ready..."
until curl -s http://localhost:8010 > /dev/null 2>&1; do
  sleep 1
done
echo "Backend is up."

echo "Starting frontend on http://localhost:3010 ..."
(cd HusfelagJS && PORT=3010 REACT_APP_API_URL=http://localhost:8010 npm start) &

wait
