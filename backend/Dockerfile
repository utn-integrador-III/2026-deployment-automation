# ---- Build stage: install only production dependencies ----
FROM node:22-slim AS build
WORKDIR /app

# Copy manifests first so Docker can cache the install layer.
COPY package*.json ./
RUN npm install --omit=dev

# ---- Runtime stage: copy app + deps into a clean image ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY . .

# Run as the built-in non-root "node" user.
USER node

# Document the port. Fly maps this internal port to public 80/443.
EXPOSE 8080

CMD ["node", "server.js"]
