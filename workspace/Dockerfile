# Start with Google's official image that has gcloud pre-installed
FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:latest

# Install Node.js v20
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs

# Set the working directory
WORKDIR /app

# Copy application code
COPY . .

# Install application dependencies
RUN npm install

# Firebase App Hosting runs the app on port 8080 by default.
EXPOSE 8080

# Define the command to run your app
CMD ["npm", "start"]
