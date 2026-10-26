FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY settings.js ./

COPY src ./src

COPY migrations ./migrations

COPY content ./content

USER node

CMD ["node", "src/index.js"]