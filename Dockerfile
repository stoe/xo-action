FROM node:slim

COPY package*.json ./

RUN npm install --production

COPY . .

ENTRYPOINT ["node", "/entrypoint.js"]
