#!/bin/sh
set -e

echo "[webBBS] waiting for database..."
node scripts/wait-for-db.mjs

echo "[webBBS] prisma generate..."
npx prisma generate

echo "[webBBS] prisma db push..."
npx prisma db push

echo "[webBBS] bootstrap..."
node scripts/bootstrap.mjs

echo "[webBBS] starting server..."
node src/server.mjs
