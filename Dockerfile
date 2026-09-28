FROM node:22-bookworm-slim

LABEL org.opencontainers.image.source="https://github.com/paulkakell/webbbs" \
      org.opencontainers.image.description="Classic BBS with a browser terminal, message boards, file areas, and doors." \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Certificates and OpenSSL support Prisma; native modules may need the toolchain.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json LICENSE ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY ops ./ops

# Audit the resolved dependencies in CI before publishing the image.
RUN npm set fund false \
  && npm set audit false \
  && npm install --no-fund --no-audit

COPY src ./src
COPY public ./public
COPY doors ./doors
RUN npm run vendor

EXPOSE 3000
CMD ["npm", "run", "docker:start"]
