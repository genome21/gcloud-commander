#!/bin/bash
echo "Listing all GCS buckets..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

gcloud storage ls

echo "Finished listing buckets."
