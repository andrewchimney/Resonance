# Main server file, will process requests and use logic from rag folder to respond to frontend requests

from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}