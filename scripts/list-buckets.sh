#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT

echo "---STEP:Setting Project"
/usr/lib/google-cloud-sdk/bin/gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Listing Buckets"
/usr/lib/google-cloud-sdk/bin/gcloud storage ls
