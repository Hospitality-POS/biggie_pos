# Stage 1: Build Vite React application with Yarn
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json yarn.lock* ./

# Install dependencies using Yarn
RUN yarn install --network-timeout 100000

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_BASE_URL
ARG VITE_APP_URL
ARG VITE_POS_API_KEY
ARG VITE_TENANT_BASE_URL
ARG VITE_APP_NAME="Relia"

ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_POS_API_KEY=$VITE_POS_API_KEY
ENV VITE_TENANT_BASE_URL=$VITE_TENANT_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Build production bundle with increased memory limit for large builds
RUN NODE_OPTIONS=--max-old-space-size=4096 yarn build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
