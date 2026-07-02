FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD npx vite preview --host 0.0.0.0 --port ${PORT:-3000}
