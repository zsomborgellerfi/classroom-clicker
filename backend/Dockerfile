FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN npm install

# Generate Prisma Client and create initial migration
RUN npx prisma generate
RUN npx prisma migrate dev --name init --create-only

# Copy source code 
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]