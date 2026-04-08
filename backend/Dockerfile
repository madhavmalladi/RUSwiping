FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

# copy source code
COPY . .

# build TypeScript
RUN npm run build

# Port 3000
EXPOSE 3000

# start
CMD ["npm", "start"]