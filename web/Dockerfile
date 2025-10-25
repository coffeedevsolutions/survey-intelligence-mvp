# Dockerfile for AI Survey Web
# Uses pinned versions for security and reproducibility

# Use specific Node.js version (LTS)
FROM node:20.11.1-alpine3.19 AS builder

# Set working directory
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade

# Copy package files
COPY web/package*.json ./

# Install dependencies with security audit
RUN npm ci && npm audit --audit-level=high

# Copy source code
COPY web/ ./

# Build application
RUN npm run build

# Production stage with nginx
FROM nginx:1.25.4-alpine3.19

# Install security updates
RUN apk update && apk upgrade

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY web/nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001

# Change ownership
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
