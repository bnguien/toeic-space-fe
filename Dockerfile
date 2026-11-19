FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci && (node -e "require('lightningcss')" || npm install --no-save --ignore-scripts --no-audit --no-fund lightningcss-linux-$(node -p process.arch)-musl@$(node -p "require('./node_modules/lightningcss/package.json').version"))

COPY . .

RUN npm run build


FROM nginx:alpine

# API gateway that /identity and /assessment are proxied to (same-origin API).
ENV API_GATEWAY_URL=http://api-gateway:8080

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx-security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
