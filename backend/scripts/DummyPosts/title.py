import requests

API_URL = "http://localhost:8000"

payload = {
    "title": "Quick Test Post",
    "description": "",
    "preset_id": None,
    "visibility": "public",
}

response = requests.post(f"{API_URL}/api/posts", json=payload)
print(response.status_code, response.text)