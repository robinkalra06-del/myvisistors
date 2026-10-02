# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/dashboard ./apps/dashboard

WORKDIR /app/apps/dashboard
RUN npm install
RUN npm run build

# Production serve stage with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

# Custom Nginx configuration for React Single Page Application (SPA) routing
RUN echo 'server {' \
  'listen 80;' \
  'location / {' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  try_files $uri $uri/ /index.html;' \
  '}' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
