# syntax=docker/dockerfile:1.4

FROM node:20-alpine AS builder

WORKDIR /workspace/cruzi-models
COPY --from=cruzi-models package*.json ./
RUN npm ci
COPY --from=cruzi-models . .
RUN npm run build

WORKDIR /workspace/cruzi-db
COPY --from=cruzi-db package*.json ./
RUN npm ci
COPY --from=cruzi-db . .
RUN npm run build

WORKDIR /workspace/chal-api
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /workspace/chal-api
ENV NODE_ENV=production

COPY --from=builder /workspace/cruzi-models /workspace/cruzi-models
COPY --from=builder /workspace/cruzi-db /workspace/cruzi-db
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /workspace/chal-api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
