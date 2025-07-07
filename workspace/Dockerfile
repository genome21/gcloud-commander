# Use the official Google Cloud SDK image as the base.
# This guarantees that gcloud is installed.
FROM google/cloud-sdk:latest

# Add the gcloud SDK to the system's PATH environment variable.
# This is the crucial step to make `gcloud` accessible to all processes.
ENV PATH /google-cloud-sdk/bin:$PATH

# Install Node.js and npm, which are required to run the Next.js application.
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    # Clean up the apt cache to reduce the final image size.
    rm -rf /var/lib/apt/lists/*

# Set the working directory for the application.
WORKDIR /app

# Copy package files and install dependencies.
# This is done in a separate step to leverage Docker's layer caching.
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code.
COPY . .

# Build the Next.js application for production.
RUN npm run build

# Set the command to start the application.
# Firebase App Hosting automatically sets the PORT environment variable,
# which `next start` will use.
CMD ["npm", "start"]
