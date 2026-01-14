# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the package files and install the dependencies
COPY package.json package-lock.json* yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm ci; fi

# Copy the source code
COPY . .

# Build the TypeScript code
RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

# Expose the port on which the app will run
EXPOSE 3000

# Start the app
CMD ["sh", "-c", "if [ -f yarn.lock ]; then yarn start; else npm start; fi"]