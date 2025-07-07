# Use the official Node.js 20 image as a base, as it's a standard for Node apps.
FROM node:20-slim

# Set the working directory inside the container.
WORKDIR /app

# Install dependencies needed to add the gcloud repository.
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg curl

# Install the Google Cloud SDK using the recommended, non-deprecated method.
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
RUN apt-get update && apt-get install -y google-cloud-sdk

# The gcloud SDK is installed in /usr/lib/google-cloud-sdk. Add it to the system's PATH.
# This is the crucial step that makes the `gcloud` command available everywhere.
ENV PATH="/usr/lib/google-cloud-sdk/bin:${PATH}"

# Copy package.json to leverage Docker layer caching.
COPY package.json ./

# Install application dependencies.
RUN npm install

# Copy the rest of the application's source code.
COPY . .

# Build the Next.js application for production.
RUN npm run build

# The PORT environment variable is automatically set by Cloud Run.
# `npm start` (which runs `next start`) will use it. We expose 8080 as a standard.
EXPOSE 8080

# The command to start the application. Cloud Run will use this.
CMD ["npm", "start"]
