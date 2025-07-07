#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT
read -p "Function Name: " FUNCTION_NAME
read -p "Region: " REGION
read -p "Source Path: " SOURCE_PATH
read -p "Runtime: " RUNTIME
read -p "Entry Point: " ENTRY_POINT

echo "---STEP:Setting Project"
/usr/lib/google-cloud-sdk/bin/gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Deploying Function"
/usr/lib/google-cloud-sdk/bin/gcloud functions deploy $FUNCTION_NAME \
  --region=$REGION \
  --source=$SOURCE_PATH \
  --runtime=$RUNTIME \
  --trigger-http \
  --entry-point=$ENTRY_POINT \
  --allow-unauthenticated

echo "---STEP:Verifying Deployment"
echo "Deployment successful. You can find your function at:"
/usr/lib/google-cloud-sdk/bin/gcloud functions describe $FUNCTION_NAME --region=$REGION --format='value(https_trigger.url)'
