# GCloud Commander

GCloud Commander provides a professional, step-by-step user interface for your `gcloud` and other shell scripts. It's designed to make complex command-line workflows more manageable, visible, and user-friendly.

## Key Features

- **Interactive UI for Shell Scripts**: Run your `gcloud` or any bash scripts from a clean web interface.
- **Step-by-Step Execution**: Visualize script execution in real-time, with each logical step clearly displayed.
- **Dynamic Input Variables**: Automatically generates input fields for your script variables, making them easy to configure.
- **AI-Powered Summaries**: Get a concise, AI-generated summary for the output of each step.
- **Raw Log Output**: View the raw terminal output for any step with a single click.
- **Built-in Script Management**: Add, edit, and delete scripts directly from the UI. No need to touch the code for simple script changes.
- **Built with Next.js & ShadCN**: A modern, performant, and beautiful application stack.

## Getting Started

To start the development server, run:

```bash
npm run dev
```

This will start the application on `http://localhost:9002`.

## Authoring Scripts

GCloud Commander uses simple conventions within your shell scripts (`.sh` files) to enable its interactive features.

### Defining Steps

To break your script into logical steps that are displayed individually in the UI, use a special `echo` command format:

```sh
echo "---STEP:Your Step Title"
```

Each time the executor encounters a line starting with `---STEP:`, it will finish the previous step and start a new one with the provided title. All subsequent output will be logged under this new step until another `---STEP:` marker is found or the script ends.

**Example:**

```sh
#!/bin/bash

echo "---STEP:Setting Project"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Creating VM Instance"
gcloud compute instances create $VM_NAME --zone=$ZONE

echo "---STEP:Verifying Status"
gcloud compute instances describe $VM_NAME --zone=$ZONE
```

This script will be displayed in the UI as three distinct steps: "Setting Project", "Creating VM Instance", and "Verifying Status".

### Defining Input Variables

To prompt the user for input variables, use the `read -p` command. The application parses these lines to automatically generate input fields in the UI.

The format is:

```sh
read -p "Prompt for User: " VARIABLE_NAME
```

- `"Prompt for User: "` is the label that will be displayed next to the input field in the UI.
- `VARIABLE_NAME` is the name of the environment variable that will be set with the user's input when the script is executed.

**Important:** The `read -p` lines are used to declare which variables the script needs. When the script is executed through the app, these lines are ignored, and the values from the UI are injected directly as environment variables.

**Example:**

```sh
#!/bin/bash
read -p "GCP Project ID: " GCLOUD_PROJECT
read -p "VM Name: " VM_NAME
read -p "GCP Zone: " ZONE

echo "---STEP:Creating VM"
echo "Creating VM $VM_NAME in project $GCLOUD_PROJECT and zone $ZONE..."
# Your gcloud command here
```

In the UI, this will generate three input fields with the labels "GCP Project ID:", "VM Name:", and "GCP Zone:". The values entered by the user will be available as `$GCLOUD_PROJECT`, `$VM_NAME`, and `$ZONE` within the script.
