# Use the official NodeJS 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim

# Install dependencies for Google Cloud SDK
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl gpg

# Add the gcloud CLI distribution URI as a package source
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

# Update the package list and install the gcloud CLI
RUN apt-get update && apt-get install -y google-cloud-sdk

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
COPY package*.json ./

# Install production dependencies.
RUN npm install --production

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD [ "npm", "start" ]
