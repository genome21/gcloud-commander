#!/bin/bash

echo "---STEP:Diagnosing Environment"
echo "1. Current PATH:"
echo "$PATH"
echo "---"
echo "2. Location of bash:"
which bash
echo "---"
echo "3. Location of gcloud:"
which gcloud
echo "---"
echo "4. Checking for gcloud at /usr/bin/gcloud:"
ls -l /usr/bin/gcloud || echo "gcloud not found in /usr/bin"
echo "---"
echo "5. Checking for gcloud in SDK path:"
ls -l /usr/lib/google-cloud-sdk/bin/gcloud || echo "gcloud not found in /usr/lib/google-cloud-sdk/bin"


echo "---STEP:Attempting to Run GCloud with Full Path"
# Try to run gcloud with the most common full path
/usr/bin/gcloud auth list --format="value(ACCOUNT)"
