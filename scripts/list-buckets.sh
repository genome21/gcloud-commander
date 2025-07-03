#!/bin/bash
[ -n "$GCLOUD_PROJECT" ] || read -p "GCP Project ID: " GCLOUD_PROJECT

echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Listing Buckets"
gcloud storage ls
