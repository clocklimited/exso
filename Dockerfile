FROM node:26.12.1-alpine AS base

RUN apk add --update curl git build-base \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY . .

RUN npm install --global yarn@1.22.22 \
  && yarn install --frozen-lockfile \
  && yarn cache clean

CMD [ "node", "app.js" ]
