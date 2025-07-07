# Use Google's official slim Cloud SDK image as a base.
# This guarantees gcloud is installed and available.
FROM google/cloud-sdk:slim

# Set the working directory inside the container
WORKDIR /app

# Install Node.js v20 using the official NodeSource repository.
# This is the recommended way to install Node.js on Debian-based systems like this one.
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    # Clean up apt caches to keep the image size down
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node -v
RUN npm -v
RUN gcloud --version

# Copy package configuration files
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Build the Next.js application for production
RUN npm run build

# Expose the port the app will run on. Cloud Run provides the PORT env var.
EXPOSE 9002

# Set the user to a non-root user for better security.
# The nodejs package creates a 'node' user.
USER node

# The command to start the application.
# It will use the PORT environment variable provided by Cloud Run.
CMD ["npm", "run", "start"]
