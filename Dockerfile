# Use Google's official Cloud SDK image as the base.
# This guarantees gcloud is installed and the PATH is set correctly.
FROM google/cloud-sdk:latest

# Set the working directory
WORKDIR /app

# Install Node.js and npm using the recommended NodeSource repository
RUN apt-get update -y && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# --- Verification Step ---
# Verify that gcloud and node are installed and in the PATH.
# If these commands fail, the build will fail.
RUN gcloud --version
RUN node --version
RUN npm --version

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app will run on
ENV PORT 8080
EXPOSE 8080

# Define the command to run the app
CMD ["npm", "start"]
