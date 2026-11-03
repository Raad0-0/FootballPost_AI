# ==============================================================================
# STAGE 1: Build the React Frontend SPA
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy package manifests and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build production bundle
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# STAGE 2: Python FastAPI Production Runtime
# ==============================================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./

# Copy built frontend SPA assets into static directory served by FastAPI
COPY --from=frontend-builder /build/dist ./static

# Seed database on build or container launch if clubpost.db not found
RUN python seed.py || true

EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamic $PORT (required by Render, Railway, Fly.io)
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
