# Dockerfile for AI Survey API
# Uses pinned versions for security and reproducibility

# Use specific Node.js version (LTS)
FROM node:20.11.1-alpine3.19

# Set working directory
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Copy package files
COPY api/package*.json ./

# Install dependencies with security audit
RUN npm ci --only=production && npm audit --audit-level=high

# Copy application code
COPY api/ ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
