#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT
read -p "VM Name: " VM_NAME
read -p "GCP Zone: " ZONE

echo "---STEP:Setting Project"
/usr/lib/google-cloud-sdk/bin/gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Creating VM Instance"
/usr/lib/google-cloud-sdk/bin/gcloud compute instances create $VM_NAME --zone=$ZONE --machine-type=e2-medium --image-family=debian-11 --image-project=debian-cloud

echo "---STEP:Verifying Status"
sleep 5
/usr/lib/google-cloud-sdk/bin/gcloud compute instances describe $VM_NAME --zone=$ZONE --format='table(name,zone,machineType,status,networkInterfaces[0].accessConfigs[0].natIP)'
