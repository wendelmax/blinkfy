FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy monorepo structure
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install and build shared
RUN npm ci
RUN cd packages/shared && npm run build

WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3001
ENV NODE_ENV=production

COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
