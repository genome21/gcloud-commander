# **App Name**: GCloud Commander

## Core Features:

- Script Selection: Script Selection: A dropdown to select available bash scripts stored on the server.
- Dynamic Input Prompts: Dynamic Input Prompts: Automatically generate input fields based on variable declarations found in the selected bash script. If no variables are in the script, notify the user.
- Script Execution: Script Execution: Execute the selected bash script with the provided inputs.
- Real-time Status Updates: Real-time Status Updates: Display status updates during script execution instead of a single scroll, using styled elements instead of simple text.
- Smart Summarization: Smart Summarization: Utilize generative AI to parse the script's output logs, identify key events, and summarize each step in the execution in a brief and helpful summary. LLM acts as a tool in identifying useful statements and omitting less important ones.

## Style Guidelines:

- Primary color: Strong purple (#9D4EDD) to evoke a sense of sophistication and cloud-related energy.
- Background color: Light grey (#E9ECEF), subtly purple, providing a clean and unobtrusive backdrop for the primary elements. 
- Accent color: Light cyan (#90E0EF), chosen for clear differentiation from the purple hues, and calls-to-action that enhance UI clarity.
- Headline Font: 'Space Grotesk' (sans-serif) to provide a futuristic but familiar and reliable techy style, fitting for describing cloud deployments and scripting tasks. Body Font: 'Inter' (sans-serif), selected to increase readability and a clean and modern sans-serif design.
- Use icons from a consistent set, representing different aspects of cloud computing and bash scripting to improve UX and visual appeal.
- Implement a clear, responsive layout with a navigation bar for script selection, input fields in a central panel, and a status update section below.
- Add subtle animations when the status of any component changes from pending -> success -> error for visually informative and responsive design.