FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# The shared package has a prepare hook which runs during npm ci in this
# workspace. Include its source before installation so that hook can compile.
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
# The shared workspace has a prepare hook that compiles TypeScript. At this
# dependency-only stage its source is intentionally not copied yet, so defer
# lifecycle scripts until the builder stage.
RUN npm ci --include=dev --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
