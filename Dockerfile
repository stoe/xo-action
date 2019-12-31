FROM node:slim

COPY package.json ./
COPY yarn.lock ./

RUN yarn add xo
RUN yarn install

COPY . .

ENTRYPOINT ["node", "/entrypoint.js"]
