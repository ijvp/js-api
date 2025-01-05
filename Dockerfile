# Stage 1: just a base environment for production
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: final image that includes node_modules + dist
# Build is result of previous workflow step
FROM base AS final
COPY dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]