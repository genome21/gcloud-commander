# Use the official Google Cloud SDK image as a base.
# This guarantees gcloud is installed and in the PATH.
FROM google/cloud-sdk:latest

# Install curl and build-essentials needed for nvm and some npm packages
RUN apt-get update && apt-get install -y curl build-essential

# Set up environment for nvm
ENV NVM_DIR /usr/local/nvm
# Use a specific LTS version of Node.js for stability
ENV NODE_VERSION 20.11.1

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Activate nvm and install Node.js
# The PATH is updated to include the nvm-installed node and npm binaries.
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
RUN . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install app dependencies using the nvm-sourced Node.js
RUN npm install

# Copy app source
COPY . .

# Build the app using the nvm-sourced Node.js
RUN npm run build

# Expose port and start app. Cloud Run provides the PORT env var.
EXPOSE 9002
CMD ["npm", "start"]
