# Use Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose app port
EXPOSE 5000

# Run the app
CMD ["node", "server.js"]