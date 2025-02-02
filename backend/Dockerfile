FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma (handles both amd64 and arm64)
RUN apk add --no-cache libc6-compat openssl dos2unix

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY . .

# Create dist directory and build
RUN mkdir -p dist && \
    npx tsc --project tsconfig.json

# Make start script executable
RUN chmod +x scripts/start.sh && \
    dos2unix scripts/start.sh

EXPOSE 3000

# Use the start script
CMD ["/bin/sh", "./scripts/start.sh"] 