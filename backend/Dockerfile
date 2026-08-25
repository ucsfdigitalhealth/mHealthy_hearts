# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# build tools for native modules (bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime stage ----
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    DB_SSL_CA=/app/certs/global-bundle.pem

# RDS CA bundle for verified TLS to the database
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    mkdir -p /app/certs && \
    curl -fsS https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/global-bundle.pem && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY . .

# Run as the non-root node user
USER node

EXPOSE 3000
CMD ["node", "app.js"]