# ============================================
# Production-Ready Multi-Stage Dockerfile
# NestJS + Prisma + MySQL
# ============================================

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-slim AS dependencies

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-slim AS production

# Set to production
ENV NODE_ENV=production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nestjs

# Copy production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema and generated client
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json for metadata
COPY --chown=nestjs:nodejs package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const http = require('http'); \
    const port = process.env.PORT || 8080; \
    http.get('http://localhost:' + port + '/api/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1));"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
