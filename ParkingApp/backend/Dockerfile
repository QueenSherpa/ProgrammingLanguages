FROM node:22-slim

WORKDIR /app

# Install dependencies first so they're cached between code changes
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["node", "src/index.js"]
