export interface Script {
  name: string;
  description: string;
  content: string;
}

export const SCRIPTS: Record<string, Script> = {
  'create-vm': {
    name: 'Create GCE VM',
    description: 'Creates a new Google Compute Engine virtual machine instance.',
    content: `#!/bin/bash
echo "Starting VM creation process..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT
read -p "Enter the desired VM name: " VM_NAME
read -p "Enter the zone (e.g., us-central1-c): " ZONE

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

echo "Creating VM instance '$VM_NAME' in zone '$ZONE'..."
gcloud compute instances create $VM_NAME --zone=$ZONE --machine-type=e2-medium --image-family=debian-11 --image-project=debian-cloud

echo "VM '$VM_NAME' created successfully."
`,
  },
  'list-buckets': {
    name: 'List GCS Buckets',
    description: 'Lists all Google Cloud Storage buckets in a project.',
    content: `#!/bin/bash
echo "Listing all GCS buckets..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

gcloud storage ls

echo "Finished listing buckets."
`,
  },
  'deploy-function': {
    name: 'Deploy Cloud Function',
    description:
      'Deploys a new Google Cloud Function from a local directory.',
    content: `#!/bin/bash
echo "Starting Cloud Function deployment..."
read -p "Enter your Google Cloud Project ID: " GCLOUD_PROJECT
read -p "Function name: " FUNCTION_NAME
read -p "Region (e.g., us-central1): " REGION
read -p "Path to source code: " SOURCE_PATH
read -p "Runtime (e.g., nodejs20): " RUNTIME
read -p "Entry point (function to execute): " ENTRY_POINT

echo "Setting project to $GCLOUD_PROJECT..."
gcloud config set project $GCLOUD_PROJECT

echo "Deploying function '$FUNCTION_NAME'..."
gcloud functions deploy $FUNCTION_NAME \\
  --region=$REGION \\
  --source=$SOURCE_PATH \\
  --runtime=$RUNTIME \\
  --trigger-http \\
  --entry-point=$ENTRY_POINT \\
  --allow-unauthenticated

echo "Function '$FUNCTION_NAME' deployed."
`,
  },
  'simple-echo': {
    name: 'Simple Echo Script',
    description: 'A simple script that echoes a message. No inputs required.',
    content: `#!/bin/bash
echo "This is a simple test script."
echo "It doesn't require any user input."
sleep 2
echo "Script finished."
`,
  },
};
