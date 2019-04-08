FROM node:10-alpine

LABEL "com.github.actions.name"="xo-action"
LABEL "com.github.actions.description"="❤️ JavaScript happiness style linter GitHub Action"
LABEL "com.github.actions.icon"="x"
LABEL "com.github.actions.color"="white"

LABEL "repository"="http://github.com/stoe/xo-action"
LABEL "homepage"="http://github.com/stoe/xo-action"
LABEL "maintainer"="Stefan Stölzle <stefan@github.com>"

COPY package*.json ./
RUN npm ci
COPY . .

ENTRYPOINT ["node", "/entrypoint.js"]
