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

# Patch Wasp SDK: replace SMTP/Nodemailer with direct Resend HTTP API call
RUN cat > /wasp-project/.wasp/out/sdk/wasp/dist/server/email/core/providers/smtp.js << 'RESEND_PATCH'
import { formatFromField, getDefaultFromField } from "../helpers.js";
export function initSmtpEmailSender(config) {
  const apiKey = config.password;
  const defaultFromField = getDefaultFromField();
  return {
    async send(email) {
      const from = formatFromField(email.from || defaultFromField);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          text: email.text,
          html: email.html,
        }),
      });
      if (!res.ok) {
        const b = await res.text();
        throw new Error("Resend API error " + res.status + ": " + b);
      }
      return res.json();
    },
  };
}
RESEND_PATCH

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
