"""SRCNN / FSRCNN tiny 모델 정의 (PyTorch).

model/architecture.md 의 스펙과 정확히 일치해야 한다.
- conv 경계: clamp-to-edge -> padding_mode='replicate' (WebGPU 셰이더의 clamp 와 일치)
- 출력은 추론 시 [0,1] 로 clamp (학습 손실은 raw 출력으로 계산)
"""
import torch.nn as nn


class SRCNN(nn.Module):
    """SRCNN(2014) tiny. 입력은 bilinear 2x 로 미리 확대된 RGB (HR 해상도)."""

    def __init__(self) -> None:
        super().__init__()
        # patch extraction: 9x9, 3->16
        self.conv1 = nn.Conv2d(3, 16, kernel_size=9, padding=4, padding_mode="replicate")
        # non-linear mapping: 1x1, 16->16
        self.conv2 = nn.Conv2d(16, 16, kernel_size=1)
        # reconstruction: 5x5, 16->3
        self.conv3 = nn.Conv2d(16, 3, kernel_size=5, padding=2, padding_mode="replicate")
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.relu(self.conv1(x))
        x = self.relu(self.conv2(x))
        x = self.conv3(x)
        return x


class FSRCNN(nn.Module):
    """FSRCNN(2016) tiny. 입력은 LR RGB, deconvolution 으로 2x 확대."""

    def __init__(self) -> None:
        super().__init__()
        self.extract = nn.Conv2d(3, 16, kernel_size=5, padding=2, padding_mode="replicate")
        self.shrink = nn.Conv2d(16, 8, kernel_size=1)
        self.map1 = nn.Conv2d(8, 8, kernel_size=3, padding=1, padding_mode="replicate")
        self.map2 = nn.Conv2d(8, 8, kernel_size=3, padding=1, padding_mode="replicate")
        self.expand = nn.Conv2d(8, 16, kernel_size=1)
        # deconvolution: 9x9, stride 2 로 정확히 2x.
        # out = (in-1)*stride - 2*padding + kernel + output_padding
        #     = (in-1)*2 - 8 + 9 + 1 = 2*in  -> 정확히 2배
        self.deconv = nn.ConvTranspose2d(
            16, 3, kernel_size=9, stride=2, padding=4, output_padding=1
        )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.relu(self.extract(x))
        x = self.shrink(x)
        x = self.relu(self.map1(x))
        x = self.relu(self.map2(x))
        x = self.expand(x)
        x = self.deconv(x)
        return x
