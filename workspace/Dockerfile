# 1. Use the official Node.js 20 image as a parent image
FROM node:20-slim

# Switch to root user to install dependencies
USER root

# 2. Install dependencies for Google Cloud SDK
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl

# 3. Add the Google Cloud SDK repository
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# 4. Install the Google Cloud SDK
RUN apt-get update && apt-get install -y google-cloud-sdk

# 5. Add gcloud to the PATH for all users and processes
ENV PATH /usr/lib/google-cloud-sdk/bin:$PATH

# Create app directory and switch to non-root user
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package.json ./

# Install app dependencies
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the app
RUN npm run build

# The PORT environment variable is automatically set by Cloud Run.
# The default start script from Next.js is `next start`.
CMD ["npm", "start"]
