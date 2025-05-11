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

# Build the NestJS application
RUN npm run build


# Stage 2 - Production Stage
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Copy only the built app and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
RUN npm install --production
