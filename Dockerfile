# syntax=docker/dockerfile:1.4

# glibc (Debian), not Alpine/musl: @cursor/sdk ships prebuilt linux-arm64
# natives (tree-sitter, ripgrep, sandbox helper) linked against ld-linux.
# Node 22.13+ is required by @cursor/sdk (node:sqlite / local agent runtime).
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS builder

WORKDIR /workspace/cruzi-models
COPY --from=cruzi-models package*.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY --from=cruzi-models src ./src
RUN npm run build

WORKDIR /workspace/cruzi-db
COPY --from=cruzi-db package*.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY --from=cruzi-db src ./src
RUN npm run build

WORKDIR /workspace/chal-api
COPY package*.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}

WORKDIR /workspace/chal-api
ENV NODE_ENV=production

# git: local agent records git metadata and may spawn git in cwd
# curl + ca-certificates: Cursor API / optional agent binary download
# libstdc++6: C++ Node addons (tree-sitter binding.node)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/cruzi-models /workspace/cruzi-models
COPY --from=builder /workspace/cruzi-db /workspace/cruzi-db
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /workspace/chal-api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
