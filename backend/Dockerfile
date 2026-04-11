# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install all deps (including dev for build + prisma CLI)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build NestJS
COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates dumb-init \
    libreoffice-writer libreoffice-calc libreoffice-common \
    default-jre-headless \
    fonts-liberation \
    fonts-freefont-ttf \
    fonts-noto \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Bundled proprietary fonts (Wingdings, Copperplate Gothic Light, etc.) used by
# the Apex proposal templates. The fonts/ directory is gitignored — see
# fonts/README.md for which .ttf files to drop in. The COPY succeeds even if
# only the README is present, in which case the workaround paths in
# proposal-fill.util.ts stay active.
COPY fonts/ /usr/share/fonts/truetype/apex/
RUN fc-cache -fv

# Non-root user
RUN groupadd -g 1001 nodejs && useradd -r -u 1001 -g nodejs nestjs

# Install production deps (omit dev)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy prisma CLI from builder — avoids a second npm install network call
# @prisma/engines (schema/migration engine) is already pulled in via @prisma below

# Copy generated Prisma client, engines, and CLI from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --chown=nestjs:nodejs prisma ./prisma

# Static assets baked into the image (logos, images used by PDF generation)
COPY --chown=nestjs:nodejs assets ./assets

# Copy compiled app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

ENV NODE_ENV=production
# LibreOffice needs a writable HOME to create its user profile at runtime
ENV HOME=/tmp
# Tell the proposal-fill pipeline that real Wingdings + Copperplate Gothic Light
# fonts are installed in /usr/share/fonts/truetype/apex/. Set to "0" (or remove)
# to fall back to the XML-rewrite workarounds.
ENV APEX_BUNDLED_FONTS=1
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:'+(process.env.PORT||8080)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1));"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
