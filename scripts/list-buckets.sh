#!/bin/bash
echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Listing Buckets"
gcloud storage ls
