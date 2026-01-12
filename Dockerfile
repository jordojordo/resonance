# =============================================================================
# Resonance Dockerfile
# Multi-stage build: Frontend → Backend with s6-overlay
# =============================================================================

# =============================================================================
# Stage 1: Build Frontend
# =============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first for layer caching
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY frontend/ .

# Build production bundle
RUN pnpm run build

# =============================================================================
# Stage 2: Python Base with s6-overlay
# =============================================================================
FROM python:3.12-slim AS base

# s6-overlay version
ARG S6_OVERLAY_VERSION=3.2.1.0

# Install xz-utils and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    xz-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz \
    && tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz \
    && rm /tmp/s6-overlay-*.tar.xz

# =============================================================================
# Stage 3: Final Image
# =============================================================================
FROM base AS final

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/api/ ./api/
COPY backend/discovery/ ./discovery/

# Copy built frontend to static directory
COPY --from=frontend-builder /build/dist ./static/

# Copy s6-overlay service definitions
COPY s6-overlay/s6-rc.d/ /etc/s6-overlay/s6-rc.d/

# Make service scripts executable
RUN chmod +x /etc/s6-overlay/s6-rc.d/*/run 2>/dev/null || true \
    && chmod +x /etc/s6-overlay/s6-rc.d/*/up 2>/dev/null || true

# Environment variables
ENV CONFIG_PATH=/config/config.yaml \
    DATA_PATH=/data \
    LOG_LEVEL=INFO \
    LB_FETCH_INTERVAL=21600 \
    CATALOG_INTERVAL=604800 \
    SLSKD_INTERVAL=3600 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create non-root user for services
RUN useradd -r -s /bin/false resonance \
    && mkdir -p /data /config \
    && chown -R resonance:resonance /app /data

# Expose web UI port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# s6-overlay entrypoint
ENTRYPOINT ["/init"]
