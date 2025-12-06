FROM node:22-alpine AS base
LABEL org.opencontainers.image.source="https://github.com/docmost/docmost"

FROM base AS builder

WORKDIR /app

COPY . .

RUN npm install -g pnpm@10.4.0
RUN pnpm install --no-frozen-lockfile
RUN pnpm build

FROM base AS installer

RUN apk add --no-cache curl bash

WORKDIR /app

# Copy apps with node user ownership
COPY --from=builder --chown=node:node /app/apps/server/dist /app/apps/server/dist
COPY --from=builder --chown=node:node /app/apps/client/dist /app/apps/client/dist
COPY --from=builder --chown=node:node /app/apps/server/package.json /app/apps/server/package.json

# Copy packages with node user ownership
COPY --from=builder --chown=node:node /app/packages/editor-ext/dist /app/packages/editor-ext/dist
COPY --from=builder --chown=node:node /app/packages/editor-ext/package.json /app/packages/editor-ext/package.json

# Copy root package files and built node_modules with node user ownership
COPY --from=builder --chown=node:node /app/package.json /app/package.json
COPY --from=builder --chown=node:node /app/pnpm*.yaml /app/
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules

RUN npm install -g pnpm@10.4.0

# Create data directory before switching to node user
RUN mkdir -p /app/data/storage && chown -R node:node /app/data

USER node

VOLUME ["/app/data/storage"]

EXPOSE 3000

CMD ["pnpm", "start"]
