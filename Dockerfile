# L.A.I. Web Inspector - Production Docker Image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy source code
COPY . .

# Install dependencies and build in one step
RUN apk add --no-cache python3 make g++
RUN npm ci && npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install Playwright browser and dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    nss freetype fontconfig harfbuzz ca-certificates ttf-freefont \
    python3 make g++

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy built artifacts
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Create data directory
RUN mkdir -p /app/backend/data

# Expose port
EXPOSE 12000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:12000/api/v1/health || exit 1

# Start command
CMD ["sh", "-c", "cd /app && node backend/dist/index.js"]