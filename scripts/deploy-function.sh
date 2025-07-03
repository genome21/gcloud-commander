#!/bin/bash
[ -n "$GCLOUD_PROJECT" ] || read -p "GCP Project ID: " GCLOUD_PROJECT
[ -n "$FUNCTION_NAME" ] || read -p "Function Name: " FUNCTION_NAME
[ -n "$REGION" ] || read -p "Region: " REGION
[ -n "$SOURCE_PATH" ] || read -p "Source Path: " SOURCE_PATH
[ -n "$RUNTIME" ] || read -p "Runtime: " RUNTIME
[ -n "$ENTRY_POINT" ] || read -p "Entry Point: " ENTRY_POINT

echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Deploying Function"
gcloud functions deploy $FUNCTION_NAME \
  --region=$REGION \
  --source=$SOURCE_PATH \
  --runtime=$RUNTIME \
  --trigger-http \
  --entry-point=$ENTRY_POINT \
  --allow-unauthenticated

echo "---STEP:Verifying Deployment"
echo "Deployment successful. You can find your function at:"
gcloud functions describe $FUNCTION_NAME --region=$REGION --format='value(https_trigger.url)'
