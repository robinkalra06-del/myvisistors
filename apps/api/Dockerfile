FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and shared workspace files
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install dependencies and build
WORKDIR /app/apps/api
RUN npm install --omit=dev
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY --from=builder /app /app

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "src/server.js"]
