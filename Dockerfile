FROM node:20-bookworm-slim

WORKDIR /app

# System deps: certificates + openssl for Prisma, and build toolchain for any native modules
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates openssl \
     python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# More deterministic install behavior, and clearer failure output in build logs
RUN npm set fund false \
  && npm set audit false \
  && npm install --no-fund --no-audit

COPY src ./src
COPY public ./public
COPY doors ./doors

# Copy xterm assets into /public/vendor
RUN npm run vendor

EXPOSE 3000

CMD ["npm", "run", "docker:start"]
