import os
import subprocess

# Update these paths to match new backend/modify location
preset = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Growl Bass Sidechain.vital'))

modify_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'modify'))

# Preset and patch are in ../modify/
preset = os.path.join(modify_dir, "Growl Bass Sidechain.vital")
patch = os.path.join(modify_dir, "llm_patch_example.json")
# modify_preset.py is in the current scripts directory
modify_script = os.path.join(os.path.dirname(__file__), "modify_preset.py")
# Output file will be written to ../modify/
outfile = os.path.join(modify_dir, "test_output.vital")

result = subprocess.run([
    "python", modify_script, preset, patch, outfile
], capture_output=True, text=True)

print("STDOUT:\n", result.stdout)
print("STDERR:\n", result.stderr)

# Check if output file was created
if os.path.exists(outfile):
    print("Output vital file created successfully.")
else:
    print("Failed to create output vital file.")
