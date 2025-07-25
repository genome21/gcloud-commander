import gradio as gr
import os
import subprocess

def get_scripts():
    scripts = []
    for filename in os.listdir("scripts"):
        if filename.endswith(".sh"):
            scripts.append(filename)
    return scripts

def get_script_parameters(script_name):
    parameters = []
    with open(os.path.join("scripts", script_name), "r") as f:
        for line in f:
            if line.startswith("read -p"):
                parts = line.split(" ")
                label = parts[2].strip('"')
                name = parts[3].strip()
                parameters.append({"name": name, "label": label})
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

        with gr.Row():
            script_dropdown = gr.Dropdown(scripts, label="Select a script")

        with gr.Column(visible=False) as parameter_column:
            parameter_inputs = []

        execute_button = gr.Button("Execute Script", visible=False)

        with gr.Row(visible=False) as output_row:
            stdout_output = gr.Textbox(label="Standard Output")
            stderr_output = gr.Textbox(label="Standard Error")

        def on_script_change(script_name):
            parameters = get_script_parameters(script_name)
            parameter_inputs.clear()

            new_inputs = []
            for param in parameters:
                new_inputs.append(gr.Textbox(label=param["label"]))

            parameter_inputs.extend(new_inputs)

            return (
                gr.Column.update(visible=len(parameters) > 0),
                *new_inputs,
                gr.Button.update(visible=True),
                gr.Row.update(visible=False)
            )

        script_dropdown.change(
            on_script_change,
            inputs=[script_dropdown],
            outputs=[parameter_column, *[gr.Textbox() for _ in range(10)], execute_button, output_row]
        )

        execute_button.click(
            execute_script,
            inputs=[script_dropdown, *parameter_inputs],
            outputs=[stdout_output, stderr_output]
        )

    return iface

if __name__ == "__main__":
    iface = create_interface()
    iface.launch()
