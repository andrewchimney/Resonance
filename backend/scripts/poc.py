import numpy as np
import laion_clap
import glob

def cosine_sim(a, b):
    a = a / (np.linalg.norm(a) + 1e-9)
    b = b / (np.linalg.norm(b) + 1e-9)
    return float(np.dot(a, b))

# 1) load model
model = laion_clap.CLAP_Module(enable_fusion=False)
model.load_ckpt()

# 2) your audio previews
audio_files = glob.glob("data/previews/*.wav")
print(f"Loaded {len(audio_files)} audio files")

# 3) embed audio (shape: [2, D])
audio_embeds = model.get_audio_embedding_from_filelist(x=audio_files, use_tensor=False)

print(audio_embeds.shape)

# 4) query text
query = "jazzy chords with a warm vibe"
text_embed = model.get_text_embedding([query], use_tensor=False)[0]  # shape: [D]

# 5) score & pick best
scores = [cosine_sim(text_embed, audio_embeds[i]) for i in range(len(audio_files))]
best_i = int(np.argmax(scores))

print("Query:", query)
for f, s in zip(audio_files, scores):
    print(f"{s:.4f}  {f}")
print("Best match:", audio_files[best_i])