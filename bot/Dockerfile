FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src

COPY migrations ./migrations

USER node

CMD ["node", "src/index.js"]