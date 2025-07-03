# Use an official Node.js runtime as a parent image.
# We use a slim image to keep the size down.
FROM node:20-slim

# Install dependencies needed for gcloud SDK and set it up.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    apt-transport-https \
    ca-certificates \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && apt-get update && apt-get install -y google-cloud-sdk \
    # Clean up apt cache to reduce final image size
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container.
WORKDIR /app

# Copy package.json and install dependencies.
# We copy package.json first to leverage Docker's layer caching.
# The npm install layer will only be re-run if package.json changes.
COPY package.json ./
RUN npm install

# Copy the rest of the application's source code.
COPY . .

# Build the Next.js application for production.
RUN npm run build

# Next.js runs on port 3000 by default. Cloud Run will set the PORT env var.
# We expose a default port for documentation and local testing.
EXPOSE 8080

# The command to run when the container starts.
CMD ["npm", "start"]
