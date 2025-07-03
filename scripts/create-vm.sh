#!/bin/bash
echo "Starting VM creation process..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT
read -p "Enter the desired VM name: " VM_NAME
read -p "Enter the zone (e.g., us-central1-c): " ZONE

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

echo "Creating VM instance '$VM_NAME' in zone '$ZONE'..."
gcloud compute instances create $VM_NAME --zone=$ZONE --machine-type=e2-medium --image-family=debian-11 --image-project=debian-cloud

echo "VM '$VM_NAME' created successfully."
