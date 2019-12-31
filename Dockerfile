FROM node:12-alpine

COPY package*.json ./
RUN npm ci
COPY . .

# ENTRYPOINT ["node", "/entrypoint.js"]
CMD ["ls -la"]
