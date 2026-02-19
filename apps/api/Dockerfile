FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY . .
RUN npx prisma generate

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
