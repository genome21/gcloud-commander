import gradio as gr
import os
import subprocess

def get_scripts():
    scripts = []
    for filename in os.listdir("scripts"):
        if filename.endswith(".sh"):
            scripts.append(filename)
    return scripts

import re

def get_script_parameters(script_name):
    parameters = []
    with open(os.path.join("scripts", script_name), "r") as f:
        content = f.read()

        # Parse parameters from read -p commands
        read_p_params = re.findall(r'read -p "([^"]+)" ([A-Z_0-9]+)', content)
        for param in read_p_params:
            parameters.append({"label": param[0], "name": param[1], "value": ""})

        # Parse parameters from gcloud commands
        gcloud_params = re.findall(r'--([a-zA-Z0-9_-]+)=?([^\s]+)', content)
        for param in gcloud_params:
            if not any(p["name"] == param[0] for p in parameters):
                parameters.append({"label": param[0], "name": param[0], "value": param[1]})

    return parameters

def execute_script(script_name, *args):
    parameters = get_script_parameters(script_name)
    env = os.environ.copy()
    for i, param in enumerate(parameters):
        env[param["name"]] = args[i]

    process = subprocess.Popen(
        ["bash", os.path.join("scripts", script_name)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )
    stdout, stderr = process.communicate()
    return stdout.decode("utf-8"), stderr.decode("utf-8")

def create_interface():
    scripts = get_scripts()

    with gr.Blocks() as iface:
        gr.Markdown("# GCloud Commander")

        script_dropdown = gr.Dropdown(scripts, label="Select a script")

        parameter_inputs = []

        execute_button = gr.Button("Execute Script")

        stdout_output = gr.Textbox(label="Standard Output")
        stderr_output = gr.Textbox(label="Standard Error")

        parameter_outputs = [gr.Textbox(visible=False) for _ in range(10)]

        def on_script_change(script_name):
            if not script_name:
                return [gr.update(visible=False) for _ in range(10)] + [gr.Button.update(visible=False)]

            parameters = get_script_parameters(script_name)

            new_inputs = []
            for param in parameters:
                new_inputs.append(gr.Textbox(label=param["label"], value=param["value"], visible=True))

            # Pad with hidden textboxes
            for _ in range(len(new_inputs), 10):
                new_inputs.append(gr.Textbox(visible=False))

            return new_inputs + [gr.Button.update(visible=True)]

        script_dropdown.change(
            on_script_change,
            inputs=[script_dropdown],
            outputs=[*parameter_outputs, execute_button]
        )

        execute_button.click(
            execute_script,
            inputs=[script_dropdown, *parameter_outputs],
            outputs=[stdout_output, stderr_output]
        )

    return iface

if __name__ == "__main__":
    iface = create_interface()
    iface.launch()
