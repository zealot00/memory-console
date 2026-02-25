# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.env.local ./
COPY --from=builder /app/.env ./

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint script
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Change ownership
RUN chown nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
ENTRYPOINT ["./docker-entrypoint.sh"]
