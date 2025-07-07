echo "---STEP:Checking Authenticated Account"
gcloud auth list

echo "---STEP:Checking Authenticated Account - FORMATTED"
gcloud auth list --format="value(ACCOUNT)"
