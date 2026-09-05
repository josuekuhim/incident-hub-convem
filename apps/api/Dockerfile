FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/
RUN npm install
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run build:api && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
WORKDIR /app/apps/api
ENV SQLITE_PATH=/app/data/incident-hub.db
EXPOSE 3000
CMD ["node", "dist/server.js"]
