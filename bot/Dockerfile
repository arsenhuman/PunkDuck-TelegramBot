FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY settings.js ./

COPY src ./src

COPY migrations ./migrations

COPY content ./content

COPY media ./media

USER node

CMD ["node", "src/index.js"]