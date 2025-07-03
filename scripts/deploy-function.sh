#!/bin/bash
echo "Starting Cloud Function deployment..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT
read -p "Function name: " FUNCTION_NAME
read -p "Region (e.g., us-central1): " REGION
read -p "Path to source code: " SOURCE_PATH
read -p "Runtime (e.g., nodejs20): " RUNTIME
read -p "Entry point (function to execute): " ENTRY_POINT

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

echo "Deploying function '$FUNCTION_NAME'..."
gcloud functions deploy $FUNCTION_NAME \
  --region=$REGION \
  --source=$SOURCE_PATH \
  --runtime=$RUNTIME \
  --trigger-http \
  --entry-point=$ENTRY_POINT \
  --allow-unauthenticated

echo "Function '$FUNCTION_NAME' deployed."
