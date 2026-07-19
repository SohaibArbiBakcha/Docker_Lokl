# Combined single-container deploy: one image serves the API, the admin
# back-office, and the landing page. Built from the repo root (not backend/),
# since it needs admin/ and landing/ too.
#
#   /            → landing page (static)
#   /admin       → react-admin back-office (static, built with base /admin/)
#   /api/v1/*    → Express API
#   /lokl.apk    → Android APK download
#
# Build: docker build -t lokl .
# Run:   docker run -p 5000:5000 --env-file backend/.env lokl

# Stage 1 — build the admin panel. VITE_API_URL defaults to a relative path
# so the built JS calls whatever origin actually serves it — no need to know
# the deployment URL at build time.
FROM node:22-alpine AS admin-build
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci
COPY admin/ ./
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2 — backend + static assets
FROM node:22-alpine AS backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src

COPY landing/index.html ./public/index.html
# Optional — only present once you've built and copied an APK into landing/
# (see landing/README.md). The image still builds fine without it; the
# landing page's download link just 404s until it's added.
COPY landing/lokl.apk* ./public/
COPY --from=admin-build /app/admin/dist ./public/admin
RUN chown -R node:node /app

# Non-root: alpine's built-in "node" user
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/index.js"]
