echo "---STEP:Checking Authenticated Account"
/usr/lib/google-cloud-sdk/bin/gcloud auth list

echo "---STEP:Checking Authenticated Account - FORMATTED"
/usr/lib/google-cloud-sdk/bin/gcloud auth list --format="value(ACCOUNT)"
