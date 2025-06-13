# Stage 1 - Build Stage
FROM node:23-alpine AS builder

# Install build dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy source code and Prisma files
COPY . .

# Prisma Generate
RUN npx prisma generate

# ⬇⬇ Tambahkan ini untuk install Chromium Puppeteer
RUN npx puppeteer browsers install chrome

# Build the NestJS application
RUN npm run build


# Stage 2 - Production Stage
FROM node:23-alpine

# Chromium dependencies (required)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy only the built app and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copy Puppeteer Chromium cache
COPY --from=builder /root/.cache/puppeteer /root/.cache/puppeteer

# Install only production dependencies
RUN npm install --production

# Copy Prisma Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
