FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json db.sql entrypoint.sh ./
COPY src/ ./src/
COPY results/ ./results/

RUN npm run build

VOLUME ["/data"]

EXPOSE 8080

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
