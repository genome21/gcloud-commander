# GCloud Commander 🚀

**The Definitive Frontend for Enterprise Cloud Orchestration**

GCloud Commander is a premier, enterprise-grade web interface that transforms complex `gcloud` and shell scripts into secure, visible, and intelligent workflows. Valued by elite DevOps and SRE teams, it provides a human-friendly command center for your powerful `gcloud-runner` microservice, turning raw command-line operations into auditable, step-by-step processes with AI-powered insights.

---

## 🧠 Why GCloud Commander Matters

In a high-stakes cloud environment, operational errors are costly and a lack of visibility is a critical risk. GCloud Commander addresses this by:

-   **Democratizing Operations:** Empowers team members to execute approved, complex scripts without needing deep shell expertise or direct machine access.
-   **Enhancing Visibility & Auditability:** Provides a real-time, step-by-step view of script execution, making processes transparent and easy to debug.
-   **Reducing Human Error:** Replaces manual CLI work with a guided UI, using dynamic forms for variables to prevent typos and incorrect parameter passing.
-   **Injecting AI Intelligence:** Leverages generative AI to automatically summarize log outputs, allowing operators to quickly understand the outcome of each step without parsing verbose logs.
-   **Decoupling UI from Execution:** Serves as the secure, interactive interface for the `GCloud Command Executor` microservice, adhering to modern security and architectural best practices.

---

## ✨ Key Features

-   **Interactive UI for Shell Scripts**: Run your `gcloud` or any bash scripts from a clean, professional web interface.
-   **Step-by-Step Execution**: Visualize script execution in real-time, with each logical step clearly displayed and its status tracked.
-   **Dynamic Input Variables**: Automatically generates input fields based on `read -p` declarations in your scripts, making them easy to configure.
-   **AI-Powered Summaries**: Get a concise, AI-generated summary for the output of each step, highlighting key outcomes and events.
-   **Raw Log Access**: Instantly toggle the view to see the raw terminal output for any step, providing deep-dive capability when needed.
-   **Built-in Script Management**: A secure interface for authorized users to add, edit, and manage the library of available scripts.
-   **Built with Next.js & ShadCN**: A modern, performant, and beautiful application stack designed for reliability and a best-in-class user experience.

---

## 🏗️ Architecture Overview

GCloud Commander is the presentation layer in a decoupled, two-part system designed for security and scalability.

`[User] ---> [GCloud Commander (Next.js Frontend)] ---> [GCloud Command Executor (Cloud Run Backend)] ---> [Google Cloud APIs]`

1.  The **User** interacts with the GCloud Commander interface.
2.  **GCloud Commander** orchestrates the workflow, handles UI rendering, manages steps, and generates AI summaries. It delegates execution of `gcloud` commands.
3.  The **GCloud Command Executor** microservice receives and securely executes only the `gcloud` commands, returning the results.

This architecture ensures that the user-facing application does not require privileged credentials; all power resides in the isolated, secured backend service.

---

## 🚀 Getting Started

To start the development server for the frontend application, run:

```bash
npm run dev
```

This will start the application on `http://localhost:9002` by default.

---

## ✍️ Authoring Scripts

GCloud Commander uses simple, powerful conventions within your shell scripts (`.sh` files) to enable its interactive features.

### Defining Steps

To break your script into logical steps that are displayed individually in the UI, use a special `echo` command format. Each `---STEP:` line marks the beginning of a new section in the execution log.

```sh
echo "---STEP:Your Step Title"
```

**Example:**

```sh
#!/bin/bash
# This script will be displayed in the UI as three distinct steps.

echo "---STEP:Validating Project Configuration"
gcloud config set project $GCLOUD_PROJECT

echo "---STEP:Provisioning High-Memory VM Instance"
gcloud compute instances create $VM_NAME --zone=$ZONE --machine-type=n2-highmem-4

echo "---STEP:Verifying Deployment and Network Status"
gcloud compute instances describe $VM_NAME --zone=$ZONE
```

### Defining Input Variables

To prompt the user for input variables, use the `read -p` command. The application parses these lines to automatically generate a type-safe input form in the UI.

The format is: `read -p "Prompt for User: " VARIABLE_NAME`

-   `"Prompt for User: "` becomes the label for the input field.
-   `VARIABLE_NAME` is the environment variable that will be substituted with the user's input when the script is executed.

> **Important:** The `read -p` lines are used **only for UI generation**. When the script is executed, these lines are ignored, and the values from the UI are securely injected into the `gcloud` commands by the orchestrator before being sent to the backend.

**Example:**

```sh
#!/bin/bash
read -p "Target GCP Project ID: " GCLOUD_PROJECT
read -p "New VM Instance Name: " VM_NAME
read -p "Deployment Zone (e.g., us-central1-a): " ZONE

echo "---STEP:Creating VM"
echo "Submitting request to create VM $VM_NAME in project $GCLOUD_PROJECT..."

gcloud compute instances create $VM_NAME --zone=$ZONE --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud
```

In the UI, this script will generate three labeled input fields, ensuring the user provides all necessary information before execution.

---

## 🔐 Security Model

GCloud Commander is designed to be a secure frontend for internal use. It inherits its security posture from the backend `GCloud Command Executor` service.

-   **No Privileged Access:** The frontend application itself has no direct access to Google Cloud APIs or credentials.
-   **Delegated Execution:** All powerful commands are sent to the isolated backend service, which should be protected with IAM, IAP, or VPC ingress controls.
-   **Script Management:** The ability to add or edit scripts should be restricted to trusted administrators.

---

## ⚠️ Disclaimer

This application provides a powerful interface for executing cloud commands. Misuse can lead to unintended infrastructure changes. Ensure that the backend service has the appropriate IAM permissions and security guardrails in place.
