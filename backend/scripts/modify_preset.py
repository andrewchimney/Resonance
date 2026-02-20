import json
import sys
import os

def apply_patch_to_vital(original_path, patch_dict, output_path):
	with open(original_path, 'r', encoding='utf-8') as f:
		vital_data = json.load(f)
	# Ensure 'settings' exists and is a dict
	if 'settings' not in vital_data or not isinstance(vital_data['settings'], dict):
		vital_data['settings'] = {}
	# Apply patch to 'settings' only
	for key, value in patch_dict.items():
		vital_data['settings'][key] = value
	with open(output_path, 'w', encoding='utf-8') as f:
		json.dump(vital_data, f, indent=2)

if __name__ == "__main__":
	if len(sys.argv) != 4:
		print("Usage: python modify_preset.py <original_vital> <patch_json> <output_vital>")
		sys.exit(1)
	original_vital = sys.argv[1]
	patch_json = sys.argv[2]
	output_vital = sys.argv[3]
	if not os.path.exists(original_vital):
		print(f"Original vital file not found: {original_vital}")
		sys.exit(1)
	if not os.path.exists(patch_json):
		print(f"Patch JSON file not found: {patch_json}")
		sys.exit(1)
	with open(patch_json, 'r', encoding='utf-8') as f:
		patch_dict = json.load(f)
	apply_patch_to_vital(original_vital, patch_dict, output_vital)
	print(f"Patched vital file saved to {output_vital}")
