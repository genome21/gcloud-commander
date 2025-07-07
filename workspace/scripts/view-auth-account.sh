#!/bin/bash

echo "---STEP:Checking Authenticated Account"
gcloud auth list --format="value(ACCOUNT)"
