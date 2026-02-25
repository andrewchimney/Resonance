import os
import uuid
from pathlib import Path

from supabase import create_client
from dotenv import load_dotenv

# Load .env from repo root (two levels up from backend/scripts)
REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

# IMPORTANT:
# create_client expects SUPABASE_URL (project URL), not your Postgres DATABASE_URL.
SUPABASE_URL = os.environ["SUPABASE_URL"]
# Prefer the official Supabase service-role env var name, but allow a fallback.
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

PRESETS_BUCKET = "presets"
PREVIEWS_BUCKET = "previews"

# Point these at your real folders
PRESETS_DIR = REPO_ROOT / "backend" / "data" / "presets"
PREVIEWS_DIR = REPO_ROOT / "backend" / "data" / "previews"

# Stable namespace for uuid5
NAMESPACE = uuid.NAMESPACE_URL


def upload_file(bucket: str, key: str, path: Path, content_type: str):
    data = path.read_bytes()
    supabase.storage.from_(bucket).upload(
        path=key,
        file=data,
        file_options={
            "content-type": content_type,
            "upsert": "true",  # <-- string, not bool
        },
    )


def upsert_preset_row(preset_id: str, title: str, preset_key: str, preview_key: str | None):
    row = {
        "id": preset_id,
        "title": title,
        "visibility": "public",
        "preset_object_key": preset_key,
        "preview_object_key": preview_key,
        "source": "seed",
        # embedding left NULL on purpose
    }
    supabase.table("presets").upsert(row).execute()


def find_matching_wav(vital_path: Path) -> Path | None:
    """
    Match previews for a given .vital where previews are stored without the
    leading "Jek's Vital Presets" folder and often without a nested "Presets/" folder.

    Example:
      presets/Jek's Vital Presets/<PACK>/Presets/<NAME>.vital
      previews/<PACK>/<NAME>.wav
    """
    rel = vital_path.relative_to(PRESETS_DIR)
    parts = list(rel.parts)

    def candidate(parts_list: list[str]) -> Path:
        return (PREVIEWS_DIR / Path(*parts_list)).with_suffix(".wav")

    variants: list[list[str]] = []

    # 1) Exact mirror
    variants.append(parts)

    # 2) Mirror but drop any "Presets" segment(s)
    variants.append([p for p in parts if p.lower() != "presets"])

    # 3) If the first folder is "Jek's Vital Presets", drop it (and retry both styles)
    if parts and parts[0].lower() in {"jek's vital presets", "jeks vital presets"}:
        parts_no_root = parts[1:]
        variants.append(parts_no_root)
        variants.append([p for p in parts_no_root if p.lower() != "presets"])

    for v in variants:
        c = candidate(v)
        if c.exists():
            return c

    return None


def stable_id_for(vital_path: Path) -> str:
    """
    Deterministic UUID based on the file’s relative path (so reruns are idempotent).
    """
    rel = vital_path.relative_to(PRESETS_DIR).as_posix()
    return str(uuid.uuid5(NAMESPACE, rel))


def main():
    if not PRESETS_DIR.exists():
        raise RuntimeError(f"PRESETS_DIR not found: {PRESETS_DIR.resolve()}")
    if not PREVIEWS_DIR.exists():
        raise RuntimeError(f"PREVIEWS_DIR not found: {PREVIEWS_DIR.resolve()}")

    vital_files = sorted(PRESETS_DIR.rglob("*.vital"))
    print(f"Found {len(vital_files)} .vital files under {PRESETS_DIR}")

    missing_wavs = 0

    for vital_path in vital_files:
        preset_id = stable_id_for(vital_path)
        wav_path = find_matching_wav(vital_path)

        if wav_path is None:
            missing_wavs += 1
            print(f"[WARN] No matching wav for: {vital_path.relative_to(PRESETS_DIR)}")
            continue

        preset_key = f"{preset_id}.vital"
        preview_key = f"{preset_id}.wav"

        # Upload files (upsert=True means re-run is safe)
        upload_file(PRESETS_BUCKET, preset_key, vital_path, "application/octet-stream")
        upload_file(PREVIEWS_BUCKET, preview_key, wav_path, "audio/wav")

        # Title: just the preset filename (no extension)
        title = vital_path.stem

        # Upsert DB row
        upsert_preset_row(
            preset_id=preset_id,
            title=title,
            preset_key=preset_key,
            preview_key=preview_key,
        )

        print(f"[OK] {title} -> {preset_id}")

    if missing_wavs:
        print(f"\nDone with warnings: {missing_wavs} presets had no matching .wav.")


if __name__ == "__main__":
    main()