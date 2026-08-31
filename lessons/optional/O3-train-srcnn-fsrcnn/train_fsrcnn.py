"""FSRCNN 학습. 입력은 LR (확대 안 함), 모델이 deconv 로 2x 확대. 목표는 HR.

실행: uv run lessons/optional/O3-train-srcnn-fsrcnn/train_fsrcnn.py
환경변수: DIV2K_HR(기본 data/div2k/DIV2K_valid_HR), EPOCHS, BATCH
"""
import os
import sys

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

sys.path.insert(0, os.path.dirname(__file__))
from dataset import DIV2KPatches  # noqa: E402
from models import FSRCNN  # noqa: E402

_TRAIN = "data/div2k/DIV2K_train_HR"
_VALID = "data/div2k/DIV2K_valid_HR"
HR_DIR = os.environ.get("DIV2K_HR") or (_TRAIN if os.path.isdir(_TRAIN) else _VALID)
EPOCHS = int(os.environ.get("EPOCHS", "60"))
BATCH = int(os.environ.get("BATCH", "16"))
ITERS = int(os.environ.get("ITERS", "500"))  # epoch 당 배치 수
OUT = "model/fsrcnn.pt"


def pick_device() -> torch.device:
    """학습에 쓸 디바이스를 고른다.

    torch.accelerator (PyTorch 2.6+) 는 cuda/mps/xpu 같은 가속기를 하나의 API 로
    다룬다. 예전처럼 torch.cuda.is_available() / torch.backends.mps.is_available()
    를 손으로 나열하지 않아도 되고, 새 가속기가 늘어도 이 코드는 그대로다.
    가속기가 없으면(CPU 전용 환경) cpu 로 떨어진다.
    """
    if torch.accelerator.is_available():
        dev = torch.accelerator.current_accelerator()
        if dev is not None:
            return dev
    return torch.device("cpu")


def main() -> None:
    dev = pick_device()
    print(f"device: {dev}  |  HR: {HR_DIR}  |  epochs: {EPOCHS}  batch: {BATCH}")

    ds = DIV2KPatches(HR_DIR, patch_hr=96, scale=2, length=BATCH * ITERS)
    dl = DataLoader(ds, batch_size=BATCH, shuffle=True, num_workers=0)

    model = FSRCNN().to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS, eta_min=1e-5)

    for epoch in range(EPOCHS):
        model.train()
        total, n = 0.0, 0
        for lr, hr in dl:
            lr, hr = lr.to(dev), hr.to(dev)
            # FSRCNN: LR 을 그대로 입력 (모델이 deconv 로 확대)
            pred = model(lr)
            loss = F.mse_loss(pred, hr)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item()
            n += 1
        sched.step()
        print(f"epoch {epoch + 1}/{EPOCHS}  loss {total / n:.6f}  lr {sched.get_last_lr()[0]:.2e}", flush=True)

    os.makedirs("model", exist_ok=True)
    torch.save(model.state_dict(), OUT)
    print(f"저장: {OUT}")


if __name__ == "__main__":
    main()
