# GCloud Commander 🚀

**The Definitive Frontend for Enterprise Cloud Orchestration**

GCloud Commander is a premier, enterprise-grade web interface that transforms complex `gcloud` and shell scripts into secure, visible, and intelligent workflows. Valued by elite DevOps and SRE teams, it provides a human-friendly command center for your powerful `gcloud-runner` microservice, turning raw command-line operations into auditable, step-by-step processes with AI-powered insights.

---

## 🧠 Why GCloud Commander Matters

In a high-stakes cloud environment, operational errors are costly and a lack of visibility is a critical risk. GCloud Commander addresses this by:

-   **Democratizing Operations:** Empowers team members to execute approved, complex scripts without needing deep shell expertise or direct machine access.
-   **Enhancing Visibility & Auditability:** Provides a real-time, step-by-step view of script execution, making processes transparent and easy to debug.
-   **Reducing Human Error:** Replaces manual CLI work with a guided UI, using dynamic forms and contextual lookups to prevent typos and incorrect parameter passing.
-   **Injecting AI Intelligence:** Leverages generative AI to automatically summarize log outputs, allowing operators to quickly understand the outcome of each step without parsing verbose logs.
-   **Decoupling UI from Execution:** Serves as the secure, interactive interface for the `GCloud Command Executor` microservice, adhering to modern security and architectural best practices.

---

## ✨ Key Features

-   **Interactive UI for Shell Scripts**: Run your `gcloud` or any bash scripts from a clean, professional web interface.
-   **Step-by-Step Execution**: Visualize script execution in real-time, with each logical step clearly displayed and its status tracked.
-   **Intelligent Parameter Detection**: Automatically discovers parameters in your scripts. It generates user-friendly input fields from both `read -p` declarations and flags (e.g., `--zone`) found directly in `gcloud` commands.
-   **Contextual Resource Lookups**: Eliminates guesswork by allowing users to fetch and select live project resources—like VPC networks, subnets, zones, and available VM machine types—directly from the UI.
-   **Pre-flight Execution Preview**: Review the final, fully-rendered command with all variables substituted before execution, ensuring complete accuracy and preventing errors.
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

### Defining User Inputs

GCloud Commander offers two powerful ways to create inputs for your scripts:

**1. Explicitly with `read -p` (for User-Friendly Labels)**

To prompt the user with a custom label for an input, use the `read -p` command. This is the best way to create a clear, human-readable form.

The format is: `read -p "Prompt for User: " VARIABLE_NAME`

-   `"Prompt for User: "` becomes the label for the input field.
-   `VARIABLE_NAME` is the environment variable that will be substituted when the script is executed.

**2. Automatically from `gcloud` Commands (for Rapid Development)**

For maximum efficiency, GCloud Commander also automatically inspects your `gcloud` commands and finds any parameters you've used (e.g., `--zone=us-central1-a` or `--machine-type=e2-medium`). It will generate an input field for each detected flag, pre-filled with the value from your script.

This means you can write a standard `gcloud` command, and the UI will automatically make it configurable without any extra work.

> **Important:** The `read -p` lines and detected parameters are used **only for UI generation**. When the script is executed, these lines are ignored, and the values from the UI are securely injected into the `gcloud` commands by the orchestrator before being sent to the backend.

**Example Combining Both Methods:**

```sh
#!/bin/bash
# A more robust script combining a friendly prompt with a detected parameter.
read -p "Target GCP Project ID: " GCLOUD_PROJECT

echo "---STEP:Creating VM"
echo "Submitting request to create VM my-instance in project $GCLOUD_PROJECT..."

# The UI will detect --zone and --machine-type and create inputs for them.
gcloud compute instances create my-instance \
    --project=$GCLOUD_PROJECT \
    --zone=us-central1-c \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

In the UI, this script generates:
- An input with the label "Target GCP Project ID:".
- A collapsible "Detected Parameters" section with inputs for "zone" and "machine-type", pre-filled with the values from the command.

---

## 🔐 Security Model

GCloud Commander is designed to be a secure frontend for internal use. It inherits its security posture from the backend `GCloud Command Executor` service.

-   **No Privileged Access:** The frontend application itself has no direct access to Google Cloud APIs or credentials.
-   **Delegated Execution:** All powerful commands are sent to the isolated backend service, which should be protected with IAM, IAP, or VPC ingress controls.
-   **Script Management:** The ability to add or edit scripts should be restricted to trusted administrators.

---

## ⚠️ Disclaimer

This application provides a powerful interface for executing cloud commands. Misuse can lead to unintended infrastructure changes. Ensure that the backend service has the appropriate IAM permissions and security guardrails in place.
