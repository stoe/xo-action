FROM node:slim

COPY package*.json ./

RUN yarn install

COPY . .

ENTRYPOINT ["node", "/entrypoint.js"]
