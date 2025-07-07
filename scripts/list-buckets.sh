#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT

echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Listing Buckets"
gcloud storage ls
