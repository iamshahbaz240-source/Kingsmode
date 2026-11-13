# ComfyUI

Cloned to `/home/user/ComfyUI` (outside monorepo to avoid git nesting).

## Start server
```bash
cd /home/user/ComfyUI
python3 main.py --cpu   # CPU mode (no GPU in this env)
# → opens on http://127.0.0.1:8188
```

## Models directory
Place Stable Diffusion checkpoints in:
- `/home/user/ComfyUI/models/checkpoints/`  (SDXL, SD1.5, FLUX, etc.)
- `/home/user/ComfyUI/models/vae/`
- `/home/user/ComfyUI/models/loras/`

## Recommended free models
- **SDXL Base**: `stabilityai/stable-diffusion-xl-base-1.0` (~6.5GB)
- **FLUX.1 Schnell**: `black-forest-labs/FLUX.1-schnell` (~24GB, best quality)
- **SD 1.5**: `runwayml/stable-diffusion-v1-5` (~4GB, fastest CPU)

## Install ComfyUI Manager (custom nodes)
```bash
cd /home/user/ComfyUI/custom_nodes
git clone --depth 1 https://github.com/ltdrdata/ComfyUI-Manager.git
```
