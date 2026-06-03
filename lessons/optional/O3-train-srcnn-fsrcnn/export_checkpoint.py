"""학습한 .pt 를 메인 트랙이 읽을 수 있는 JSON checkpoint 로 내보낸다.

model/srcnn.pt   -> model/srcnn.checkpoint   (JSON)
model/fsrcnn.pt  -> model/fsrcnn.checkpoint  (JSON)

이 JSON 은 Bun(scripts/make-weights.ts)이 읽어 lessons/*/model/*-weights.ts 로 변환한다.
export 레이아웃은 model/architecture.md 의 계약을 따른다:
- conv  weight: [outC][inC][kh][kw]  (PyTorch Conv2d.weight 순서)
- deconv weight: [inC][outC][kh][kw] (PyTorch ConvTranspose2d.weight 순서)
"""
import json
import os
import sys

import torch

sys.path.insert(0, os.path.dirname(__file__))
from models import FSRCNN, SRCNN  # noqa: E402


def layer_dict(name: str, module, ttype: str) -> dict:
    w = module.weight.detach().cpu().numpy()
    b = module.bias.detach().cpu().numpy()
    if ttype == "conv":
        out_c, in_c, kh, kw = w.shape  # Conv2d: [outC, inC, kh, kw]
    else:
        in_c, out_c, kh, kw = w.shape  # ConvTranspose2d: [inC, outC, kh, kw]
    return {
        "name": name,
        "type": ttype,
        "inC": int(in_c),
        "outC": int(out_c),
        "kh": int(kh),
        "kw": int(kw),
        "weight": w.reshape(-1).astype("float32").tolist(),
        "bias": b.reshape(-1).astype("float32").tolist(),
    }


def export_srcnn() -> dict:
    m = SRCNN()
    m.load_state_dict(torch.load("model/srcnn.pt", map_location="cpu"))
    m.eval()
    return {
        "model": "srcnn",
        "scale": 2,
        "preUpscale": "bilinear",
        "layers": [
            {**layer_dict("conv1", m.conv1, "conv"), "activation": "relu"},
            {**layer_dict("conv2", m.conv2, "conv"), "activation": "relu"},
            {**layer_dict("conv3", m.conv3, "conv"), "activation": "none"},
        ],
    }


def export_fsrcnn() -> dict:
    m = FSRCNN()
    m.load_state_dict(torch.load("model/fsrcnn.pt", map_location="cpu"))
    m.eval()
    return {
        "model": "fsrcnn",
        "scale": 2,
        "preUpscale": "none",
        "deconv": {"stride": 2, "padding": 4, "output_padding": 1},
        "layers": [
            {**layer_dict("extract", m.extract, "conv"), "activation": "relu"},
            {**layer_dict("shrink", m.shrink, "conv"), "activation": "none"},
            {**layer_dict("map1", m.map1, "conv"), "activation": "relu"},
            {**layer_dict("map2", m.map2, "conv"), "activation": "relu"},
            {**layer_dict("expand", m.expand, "conv"), "activation": "none"},
            {**layer_dict("deconv", m.deconv, "deconv"), "activation": "none"},
        ],
    }


def main() -> None:
    os.makedirs("model", exist_ok=True)
    for name, fn in [("srcnn", export_srcnn), ("fsrcnn", export_fsrcnn)]:
        pt = f"model/{name}.pt"
        if not os.path.exists(pt):
            print(f"건너뜀: {pt} 없음 (train_{name}.py 를 먼저 실행하세요)")
            continue
        data = fn()
        out = f"model/{name}.checkpoint"
        with open(out, "w") as f:
            json.dump(data, f)
        n_params = sum(len(layer["weight"]) + len(layer["bias"]) for layer in data["layers"])
        print(f"export: {out}  (layers={len(data['layers'])}, params={n_params})")


if __name__ == "__main__":
    main()
