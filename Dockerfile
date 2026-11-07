FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:standalone

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
COPY --from=build /app/standalone-dist ./standalone-dist
COPY standalone/server.mjs ./standalone/server.mjs
RUN mkdir -p /data && chown node:node /data /app
USER node
EXPOSE 8080
CMD ["node", "standalone/server.mjs"]
