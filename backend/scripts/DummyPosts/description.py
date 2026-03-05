import requests

API_URL = "http://localhost:8000"

payload = {
    "title": "Amazing Synth Bass",
    "description": "Deep, powerful bass with rich harmonics. Perfect for adding warmth and depth to your tracks. Crafted with high-quality samples and designed to fit seamlessly into any genre, this synth bass will elevate your music to the next level.",
    "preset_id": None,
    "visibility": "public"
}

response = requests.post(f"{API_URL}/api/posts", json=payload)
print(response.status_code, response.text)