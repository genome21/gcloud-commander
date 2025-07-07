# Use the official Node.js 20 slim image as a base.
# https://hub.docker.com/_/node
FROM node:20-slim

# Set the working directory in the container.
# https://docs.docker.com/reference/dockerfile/#workdir
WORKDIR /app

# Install dependencies required to add the gcloud apt repository.
# https://cloud.google.com/sdk/docs/install#deb
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl

# Add the gcloud CLI distribution URI as a package source.
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud public key.
# The gpg --dearmor command is the recommended way to handle GPG keys for apt.
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

# Update the package list and install the gcloud CLI.
RUN apt-get update && apt-get install -y google-cloud-sdk

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Install production dependencies.
RUN npm install --production

# Copy local code to the container image.
COPY . .

# Set the command to run when the container starts.
CMD ["npm", "start"]
