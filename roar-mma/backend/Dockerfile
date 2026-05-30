FROM node:22-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create logs and data directories (before switching user)
RUN mkdir -p /app/data /app/logs

# Copy package files separately for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code selectively (not node_modules, .env, etc.)
COPY server.js ./
# COPY .eslintrc.json ./
COPY src/ ./src/
COPY routes/ ./routes/
COPY services/ ./services/
COPY middleware/ ./middleware/
COPY db/ ./db/
COPY scripts/ ./scripts/

# Set ownership for writable directories
RUN chown -R appuser:appgroup /app/data /app/logs

USER appuser

EXPOSE 3001

# Health check with proper error handling for connection failures
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "try { require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1)) } catch(e) { process.exit(1) }"

CMD ["npm", "start"]
