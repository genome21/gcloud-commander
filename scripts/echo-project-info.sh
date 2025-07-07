#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT
read -p "Selected Region: " REGION
read -p "Selected Zone: " ZONE
read -p "Selected Network: " NETWORK
read -p "Selected Subnet: " SUBNET

echo "---STEP:Displaying Project Information"
echo "Project ID: $GCLOUD_PROJECT"
echo "Region: $REGION"
echo "Zone: $ZONE"

echo "---STEP:Displaying Network Information"
echo "Network: $NETWORK"
echo "Subnet: $SUBNET"

echo "---STEP:Verification Complete"
echo "All provided values have been successfully echoed."
