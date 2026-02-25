FROM node:20-alpine

WORKDIR /app

# Copy monorepo structure
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install and build shared
RUN npm install --omit=dev 2>/dev/null || npm ci --omit=dev
RUN cd packages/shared && npm run build 2>/dev/null || true

WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3001
ENV NODE_ENV=production

COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
