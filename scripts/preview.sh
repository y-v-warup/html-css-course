#!/bin/sh
# LabelGuard AI preview server.
# One process serves both the API and the built single-page frontend,
# so Freebuff's managed preview only ever needs a single command.
set -e

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f frontend/dist/index.html ]; then
  echo "frontend/dist not found — building the frontend first..."
  npm run build --prefix frontend
fi

# The shared install command is Node-only, so make sure the Python
# dependencies are present before handing over to uvicorn.
if ! python3 -c "import fastapi, uvicorn, dotenv, PIL" 2>/dev/null; then
  echo "Installing backend Python dependencies..."
  pip3 install -q -r backend/requirements.txt
fi

cd backend
exec python3 -m uvicorn server:app --host 0.0.0.0 --port "${PORT:-8000}"
