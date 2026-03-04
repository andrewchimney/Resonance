FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip

# --- Vita: try PyPI, fallback to build from source ---
ARG VITA_REPO=https://github.com/DBraun/Vita.git
ARG VITA_REF=main

RUN set -eux; \
    if pip install --no-cache-dir vita; then \
        echo "Installed vita from PyPI"; \
    else \
        echo "PyPI install failed; building vita from source"; \
        apt-get update && apt-get install -y --no-install-recommends \
            build-essential \
            cmake \
            ninja-build \
            git \
            python3-dev \
            pkg-config \
        && rm -rf /var/lib/apt/lists/*; \
        git clone --recurse-submodules "$VITA_REPO" /tmp/Vita; \
        cd /tmp/Vita; \
        git checkout "$VITA_REF" || true; \
        chmod +x build_linux.sh || true; \
        ./build_linux.sh; \
        mkdir -p vita; \
        # copy the built shared lib to the exact path setup.py asserts
        if [ -f headless/builds/linux/build/libvita.so ]; then \
            cp headless/builds/linux/build/libvita.so vita/vita.so; \
        elif [ -f headless/builds/linux/build/vita.so ]; then \
            cp headless/builds/linux/build/vita.so vita/vita.so; \
        else \
            echo "Could not find built libvita.so/vita.so"; \
            find . -maxdepth 6 -name "libvita.so" -o -name "vita.so" -print; \
            exit 1; \
        fi; \
        pip install --no-cache-dir .; \
        rm -rf /tmp/Vita; \
    fi

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV HF_HOME=/root/.cache/huggingface
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]