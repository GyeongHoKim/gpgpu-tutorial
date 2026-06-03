"""SRCNN 학습. 입력은 bilinear 2x 로 확대된 LR (HR 해상도), 목표는 HR.

실행: .venv/bin/python lessons/optional/O3-train-srcnn-fsrcnn/train_srcnn.py
환경변수: DIV2K_HR(기본 data/div2k/DIV2K_valid_HR), EPOCHS, BATCH
"""
import os
import sys

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.dirname(__file__))
from dataset import DIV2KPatches  # noqa: E402
from models import SRCNN  # noqa: E402

HR_DIR = os.environ.get("DIV2K_HR", "data/div2k/DIV2K_valid_HR")
EPOCHS = int(os.environ.get("EPOCHS", "10"))
BATCH = int(os.environ.get("BATCH", "16"))
OUT = "model/srcnn.pt"


def pick_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def main() -> None:
    dev = pick_device()
    print(f"device: {dev}  |  HR: {HR_DIR}  |  epochs: {EPOCHS}  batch: {BATCH}")

    ds = DIV2KPatches(HR_DIR, patch_hr=96, scale=2, length=BATCH * 200)
    dl = DataLoader(ds, batch_size=BATCH, shuffle=True, num_workers=0)

    model = SRCNN().to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)

    for epoch in range(EPOCHS):
        model.train()
        total, n = 0.0, 0
        for lr, hr in dl:
            lr, hr = lr.to(dev), hr.to(dev)
            # SRCNN: LR 을 먼저 bilinear 로 확대해 입력 (HR 해상도)
            lr_up = F.interpolate(lr, scale_factor=2, mode="bilinear", align_corners=False)
            pred = model(lr_up)
            loss = F.mse_loss(pred, hr)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item()
            n += 1
        print(f"epoch {epoch + 1}/{EPOCHS}  loss {total / n:.6f}")

    os.makedirs("model", exist_ok=True)
    torch.save(model.state_dict(), OUT)
    print(f"저장: {OUT}")


if __name__ == "__main__":
    main()
