FROM node:22-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create directories needed at runtime (before switching user)
RUN mkdir -p /app/data /app/logs

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code (selective — .dockerignore filters out node_modules, .env, etc.)
COPY backend/ ./

# Set ownership for writable directories
RUN chown -R appuser:appgroup /app/data /app/logs

USER appuser

EXPOSE 3001

# Health check with proper error handling for connection failures
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "try { require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1)) } catch(e) { process.exit(1) }"

CMD ["node", "server.js"]
