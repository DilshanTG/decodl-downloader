# Stage 1: Run wasp build to generate server code
# Uses Debian (not Alpine) because the Wasp CLI binary requires glibc
FROM node:22.22.2-bookworm-slim AS wasp-builder
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g @wasp.sh/wasp-cli@0.22.0
WORKDIR /wasp-project
COPY app/ ./
# REACT_APP_API_URL is needed for the frontend build inside wasp build
ARG REACT_APP_API_URL=https://api.stockmart.lk
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN wasp build

# Stage 2: Build server — mirrors the generated Dockerfile exactly
FROM node:22.22.2-alpine3.23 AS base
RUN apk --no-cache -U upgrade
RUN apk add --no-cache openssl

FROM base AS server-builder
RUN apk add --no-cache python3 build-base libtool autoconf automake
WORKDIR /app
COPY --from=wasp-builder /wasp-project/.wasp/out/src ./src
COPY --from=wasp-builder /wasp-project/.wasp/out/package.json .
COPY --from=wasp-builder /wasp-project/.wasp/out/package-lock.json .
COPY --from=wasp-builder /wasp-project/.wasp/out/tsconfig.json .
COPY --from=wasp-builder /wasp-project/.wasp/out/server .wasp/out/server
COPY --from=wasp-builder /wasp-project/.wasp/out/sdk .wasp/out/sdk
COPY --from=wasp-builder /wasp-project/.wasp/out/libs .wasp/out/libs
RUN npm install && cd .wasp/out/server && npm install
COPY --from=wasp-builder /wasp-project/.wasp/out/db/schema.prisma .wasp/out/db/
RUN cd .wasp/out/server && npx prisma generate --schema='../db/schema.prisma'
RUN cd .wasp/out/server && npm run bundle
RUN mkdir -p ./.wasp/out/server/node_modules

# Stage 3: Production image
FROM base AS server-production
RUN apk add --no-cache python3
ENV NODE_ENV=production
WORKDIR /app
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/.wasp/out/server/node_modules .wasp/out/server/node_modules
COPY --from=server-builder /app/.wasp/out/server/bundle .wasp/out/server/bundle
COPY --from=server-builder /app/.wasp/out/server/package*.json .wasp/out/server/
COPY --from=wasp-builder /wasp-project/.wasp/out/db/ .wasp/out/db/
EXPOSE ${PORT}
WORKDIR /app/.wasp/out/server
ENTRYPOINT ["npm", "run", "start-production"]
