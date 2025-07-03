#!/bin/bash
[ -n "$VM_NAME" ] || read -p "VM Name: " VM_NAME
[ -n "$ZONE" ] || read -p "GCP Zone: " ZONE

echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Creating VM Instance"
gcloud compute instances create $VM_NAME --zone=$ZONE --machine-type=e2-medium --image-family=debian-11 --image-project=debian-cloud

echo "---STEP:Verifying Status"
sleep 5
gcloud compute instances describe $VM_NAME --zone=$ZONE --format='table(name,zone,machineType,status,networkInterfaces[0].accessConfigs[0].natIP)'
