# Use the official Node.js 20 image as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for Google Cloud SDK
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl

# Add the Google Cloud SDK repository using the recommended gpg method
RUN curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list

# Install the Google Cloud SDK
RUN apt-get update && apt-get install -y google-cloud-sdk

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies, including dev dependencies needed for the build
RUN npm install --production=false

# Copy the rest of the application's code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
ENV PORT 9002
EXPOSE 9002

# Start the app
CMD ["npm", "start", "-p", "9002"]
