"""DIV2K 패치 데이터셋. HR 이미지에서 랜덤 패치를 뽑아 (LR, HR) 쌍을 만든다.

LR 은 HR 을 bicubic 으로 1/scale 축소해 만든다.
- SRCNN: 학습 스크립트에서 LR 을 다시 bilinear 로 확대해 입력으로 쓴다.
- FSRCNN: LR 을 그대로 입력으로 쓴다 (모델이 deconv 로 확대).
"""
import glob
import os
import random

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import Dataset


class DIV2KPatches(Dataset):
    def __init__(self, hr_dir: str, patch_hr: int = 96, scale: int = 2, length: int = 3000):
        self.files = sorted(glob.glob(os.path.join(hr_dir, "*.png")))
        if not self.files:
            raise RuntimeError(
                f"HR 이미지를 찾지 못했습니다: {hr_dir}\n"
                "먼저 'bash scripts/download-div2k.sh' 로 DIV2K 를 받으세요."
            )
        assert patch_hr % scale == 0, "patch_hr 은 scale 로 나누어떨어져야 합니다."
        self.patch_hr = patch_hr
        self.scale = scale
        self.length = length

    def __len__(self) -> int:
        return self.length

    def __getitem__(self, idx):
        path = random.choice(self.files)
        img = Image.open(path).convert("RGB")
        w, h = img.size
        ph = self.patch_hr
        x = random.randint(0, w - ph)
        y = random.randint(0, h - ph)
        hr = img.crop((x, y, x + ph, y + ph))

        hr_t = torch.from_numpy(np.asarray(hr, dtype=np.float32) / 255.0).permute(2, 0, 1)
        # bicubic 다운스케일로 LR 생성
        lr_t = (
            F.interpolate(
                hr_t.unsqueeze(0),
                scale_factor=1.0 / self.scale,
                mode="bicubic",
                align_corners=False,
            )
            .clamp(0.0, 1.0)
            .squeeze(0)
        )
        return lr_t, hr_t
