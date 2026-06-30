# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and assemble the app
FROM node:20-alpine AS runner
WORKDIR /app/backend

# Copy backend dependencies and install
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend codebase
COPY backend/ ./

# Copy compiled frontend from Stage 1 to /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment defaults
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server.js"]
