# Use the official Google Cloud CLI slim image as a base
FROM google/cloud-sdk:slim

# Set the PATH to include the Google Cloud SDK. This is crucial.
ENV PATH /google-cloud-sdk/bin:$PATH

# Install dependencies for adding NodeSource repository
RUN apt-get update && apt-get install -y curl gnupg

# Add the NodeSource repository for Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
RUN apt-get install -y nodejs

# Verify installations
RUN node -v
RUN npm -v
RUN gcloud --version

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
# This is optimized for Docker layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose the port the app runs on (App Hosting will map this)
EXPOSE 8080

# Start the app. App Hosting uses the start script from package.json.
CMD ["npm", "start"]
