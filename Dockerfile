FROM node:20-alpine

WORKDIR /app

# System deps (for node-gyp if needed by downstream deps)
RUN apk add --no-cache bash

COPY package.json ./
COPY prisma ./prisma
COPY scripts ./scripts

RUN npm install

COPY src ./src
COPY public ./public
COPY doors ./doors

# Copy xterm assets into /public/vendor
RUN npm run vendor

EXPOSE 3000

CMD ["npm", "run", "docker:start"]
