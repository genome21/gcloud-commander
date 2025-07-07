# Use the official Google Cloud CLI image as the base
FROM google/google-cloud-cli:latest

# Add the Google Cloud SDK to the PATH
ENV PATH="/google-cloud-sdk/bin:${PATH}"

# Set the working directory
WORKDIR /app

# Install Node.js and npm
# We need to add the nodejs repository to get a recent version
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    npm install -g npm@latest

# Copy application dependency manifests to the container image
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy local code to the container image
COPY . .

# Set the command to run when the container starts
CMD ["npm", "start"]
