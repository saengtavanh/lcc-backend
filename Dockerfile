# Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies (only production)
COPY package*.json ./
RUN npm install --only=production

# Copy source code
COPY . .

# Ensure uploads dir exists inside container
RUN mkdir -p /app/uploads

# Expose API port
EXPOSE 9001

# Start the server
CMD ["node", "server.js"]
