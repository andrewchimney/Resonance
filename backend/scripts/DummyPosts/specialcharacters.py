import requests

API_URL = "http://localhost:8000"

payload = {
    "title": "Etheral Pad 🎹✨",
    "description": "Soft, dreamy pad with lush textures and shimmering harmonics. Perfect for creating atmospheric soundscapes and adding depth to your compositions. Crafted with high-quality samples and designed to fit seamlessly into any genre, this pad will elevate your music to new heights.",
    "preset_id": None,
    "visibility": "public"
}

response = requests.post(f"{API_URL}/api/posts", json=payload)
print(response.status_code, response.text)