FROM node:10-alpine

LABEL "com.github.actions.name"="xo-action"
LABEL "com.github.actions.description"="GitHub Action ❤️ JavaScript happiness style linter"
LABEL "com.github.actions.icon"="x"
LABEL "com.github.actions.color"="white"

LABEL "repository"="https://github.com/stoe/xo-action"
LABEL "homepage"="https://github.com/stoe/xo-action"
LABEL "maintainer"="Stefan Stölzle <stefan@github.com>"

COPY package*.json ./
RUN npm ci
COPY . .

ENTRYPOINT ["node", "/entrypoint.js"]
