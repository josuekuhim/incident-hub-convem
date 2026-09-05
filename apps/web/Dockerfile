FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json apps/web/
RUN npm install
COPY tsconfig.base.json ./
COPY apps/web apps/web
RUN npm run build:web

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
