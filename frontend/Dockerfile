# Frontend Dockerfile for React (Vite)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npx", "vite", "--host"]
