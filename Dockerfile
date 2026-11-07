FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

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
