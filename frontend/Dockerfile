FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose the frontend port
EXPOSE 5174

# Run the Vite dev server
# Use --host for accessibility outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
