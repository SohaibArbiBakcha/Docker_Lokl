FROM node:22-alpine

WORKDIR /app

# Install deps first so this layer caches across code-only changes
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Non-root: alpine's built-in "node" user
USER node

EXPOSE 5000

# Consumed by orchestrators (Docker Compose/Kubernetes) as a container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/index.js"]
