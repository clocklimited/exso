FROM node:18.16.0-alpine AS base

RUN apk add --update curl git build-base \
  && rm -rf /var/cache/apk/*

WORKDIR /app

COPY . .

RUN yarn install && yarn cache clean

CMD [ "node", "app.js" ]
