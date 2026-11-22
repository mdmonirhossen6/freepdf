FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY lib ./lib
COPY data/source/HSCFreePDF_Complete_Index.csv ./data/source/HSCFreePDF_Complete_Index.csv
COPY bot ./bot

RUN npm run bot:seed

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "bot:start"]
