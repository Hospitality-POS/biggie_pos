FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn run build

# Step 2: Use a lightweight Nginx container to serve the files
FROM nginx:alpine

# Used by env.sh at container start
ENV APP_PREFIX=APP_PREFIX_ \
    ASSET_DIR=/var/www/html

# Copy Nginx config if you have custom routing
COPY ./nginx.conf /etc/nginx/nginx.conf

# Copy the built app from the builder stage
COPY --from=builder /app/dist /var/www/html/

# Copy the runtime injection script into the container
COPY env.sh /docker-entrypoint.d/env.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/env.sh \
    && chmod +x /docker-entrypoint.d/env.sh

# The nginx image's default ENTRYPOINT already runs /docker-entrypoint.d/*.sh,
# so no ENTRYPOINT line is needed.
CMD ["nginx", "-g", "daemon off;"]