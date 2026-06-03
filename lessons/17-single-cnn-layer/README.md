# 17. 최소 CNN Layer 1개 구현

## 학습 목표

이 챕터를 마치면, 16장에서 **그림과 수식으로만** 봤던 conv layer 한 장(RGB 3채널 → feature map 16장)을 **실제로 GPU 위에서 돌려** 결과를 눈으로 볼 수 있습니다. 구체적으로 (1) weight·bias 를 storage buffer 에 올리고, (2) 픽셀마다 $\mathbf{o} = \mathrm{ReLU}(W\mathbf{p} + \mathbf{b})$ 를 계산해 16채널 feature map 을 만들고, (3) 16채널은 `rgba8` 텍스처에 안 들어가므로 **storage buffer(`array<f32>`)** 로 다룬다는 점을, 이미 검증된 CNN 추론 엔진(`src/core/cnn.ts`)을 가져다 써서 구현합니다. 그리고 채널을 바꿔 가며 **"filter 마다 도드라지는 특징이 다르다"** 는 16장의 메시지를 직접 확인합니다.

## 예상 소요 시간 · 난이도

약 45분 · ★★★☆☆ (16장 개념을 코드로 옮기는 첫 구현. 셰이더는 엔진이 제공하므로 파이프라인 연결에 집중)

## 사전 지식

- **16장 (CNN 을 이미지 필터로)**: conv layer 한 장이 "픽셀마다 $\mathbf{o} = \mathrm{ReLU}(W\mathbf{p} + \mathbf{b})$ 를 반복하는 것"이라는 정의. 이 챕터는 그 식을 그대로 코드로 옮깁니다.
- **13장 (GPU grayscale)**: `initWebGPU` → 텍스처 → compute → `Blitter.blit` 로 이어지는 GPU 파이프라인 골격과 `stats` 패널. 이 챕터도 같은 골격입니다.
- **15장 (GPU convolution)**: 주변 $3\times3$ 패치를 읽어 kernel 과 내적하는 연산. CNN conv layer 도 같은 연산을 채널·필터만 늘려 반복합니다.
- **7장 (buffer 와 texture)**: storage buffer 가 무엇인지. 이 챕터에서 feature map 을 storage buffer 로 다룹니다.

## 개념 설명

### 우리가 만드는 것: conv layer 딱 한 장

16장의 결론을 다시 적습니다. conv layer 한 장이 한 픽셀 위치에서 하는 일은 **행렬-벡터 곱 + bias + ReLU**, 단 한 줄입니다.

```math
\mathbf{o} = \mathrm{ReLU}(W\mathbf{p} + \mathbf{b})
```

기호를 이 챕터의 구체적인 크기로 풉니다. 입력은 RGB(input channel 3개), 출력은 feature map 16장(output channel 16개), kernel 은 $3\times3$ 입니다.

- $\mathbf{p} \in \mathbb{R}^{27}$ : 한 픽셀 위치에서 **모든 입력 채널의 $3\times3$ 주변 패치**를 한 줄로 편 벡터. R 패치 9개 + G 패치 9개 + B 패치 9개 $= 27$.
- $W \in \mathbb{R}^{16 \times 27}$ : weight 행렬. **각 행이 filter 하나**(출력 채널 하나)이고, 행이 16개라 feature map 이 16장 나옵니다.
- $\mathbf{b} \in \mathbb{R}^{16}$ : 채널(=feature map)마다 하나씩인 bias.
- $\mathbf{o} \in \mathbb{R}^{16}$ : 그 픽셀 자리의 **16개 feature map 값**. ReLU 로 음수를 0 으로 만든 뒤 저장합니다.

$W\mathbf{p}$ 의 $k$ 번째 원소가 $\langle \mathbf{w}_k, \mathbf{p}\rangle$ 라는, 선형대수에서 배운 성질 그대로입니다. 즉 한 출력 채널 $k$ 의 한 픽셀은 결국 15장에서 본 **내적 + bias** 한 번입니다.

```math
o_k(x, y) = \langle \mathbf{w}_k,\ \mathbf{p} \rangle + b_k
          = \sum_{c}\ \sum_{i, j}\ I_c(x+i,\ y+j)\, W_{k,c}(i,j) + b_k
```

이 식을 **모든 픽셀 $(x, y)$ 에서, 모든 출력 채널 $k = 0 \dots 15$ 에 대해** 반복하면 conv layer 한 장이 끝납니다. GPU 에서는 **invocation(픽셀) 하나가 그 위치의 16개 출력 채널을 모두 계산**합니다 — 이게 `src/core/shaders/conv.wgsl` 의 안쪽 3중 루프입니다(`for k → for c → for i,j`).

> **주의 (16채널은 텍스처에 안 들어간다 — 이 챕터의 핵심):**
> `rgba8` 텍스처는 채널이 **4개**(R·G·B·A)뿐입니다. 그런데 우리 feature map 은 **16장**이라 텍스처 한 장에 담을 수 없습니다. 그래서 중간 feature map 을 **storage buffer 의 `array<f32>`** 로 다룹니다. 16채널이 4채널을 넘는 순간, "이미지 = 텍스처" 라는 그림이 깨지고 **명시적 인덱싱으로 접근하는 큰 float 배열**로 바뀝니다. 이 한 가지가 13~15장(텍스처만 쓰던 챕터)과 이 챕터의 가장 큰 차이입니다.

### feature buffer 의 메모리 레이아웃: $(y \cdot W + x)\cdot C + c$

feature map 을 storage buffer 의 1차원 `array<f32>` 로 다루므로, "몇 번째 픽셀의 몇 번째 채널" 을 1차원 인덱스로 변환하는 규칙이 필요합니다. 이 프로젝트(그리고 `conv.wgsl`)는 **channel-last** 레이아웃을 씁니다. 너비 $W$, 채널 수 $C$ 일 때 픽셀 $(x, y)$ 의 채널 $c$ 값은 다음 위치에 있습니다.

```math
\text{index} = (y \cdot W + x)\cdot C + c
```

- $y \cdot W + x$ : 픽셀을 **왼→오, 위→아래** 순서로 센 픽셀 번호 (row-major).
- $\times C$ : 픽셀 하나당 채널이 $C$ 개씩 연속으로 붙어 있으므로, 픽셀 번호에 $C$ 를 곱해 그 픽셀의 채널 묶음 시작 위치를 구합니다.
- $+ c$ : 그 묶음 안에서 원하는 채널.

즉 한 픽셀의 16개 채널이 메모리에 **나란히** 놓이고, 그다음 픽셀의 16개 채널이 이어집니다. 그림으로:

```text
픽셀 (0,0)         픽셀 (1,0)         픽셀 (2,0)        ...
[c0 c1 ... c15]   [c0 c1 ... c15]   [c0 c1 ... c15]   ...
 └ 16개 ┘          └ 16개 ┘          └ 16개 ┘
index 0..15        index 16..31      index 32..47
```

엔진 함수들(`rgbToFeatures`, `runConv`, `featuresToRgb`)이 모두 이 식으로 인덱싱하므로, 우리는 buffer 를 `createFeatureBuffer(device, W, H, C)` 로 **크기만 맞춰 만들어** 넘기면 됩니다. 인덱스 계산은 셰이더 안에서 일어납니다.

> **주의 (ReLU 이전 음수는 float buffer 라서 보존된다):**
> conv 출력 $W\mathbf{p} + \mathbf{b}$ 는 **음수가 나올 수 있습니다**(예: 색 대비 filter 는 R−G 를 계산하므로 절반은 음수). 만약 이 중간값을 0~1 로 클램프하는 `unorm` 텍스처에 저장하면 음수가 0 으로 잘려 정보가 사라집니다. 우리는 `array<f32>` storage buffer 에 저장하므로 **음수가 그대로 보존**되고, ReLU 는 셰이더 안에서 명시적으로 $\max(0, x)$ 를 적용합니다. (단, 화면에 그릴 때 쓰는 `featuresToRgb` 만 마지막에 `rgba8unorm` 으로 클램프합니다 — 그건 **표시용**이라 잘려도 괜찮습니다.)

### 파이프라인: 텍스처 → buffer → conv → buffer → 텍스처 → 화면

입력은 텍스처(이미지)이고 출력도 화면(텍스처)인데, 중간 feature map 만 buffer 입니다. 그래서 파이프라인은 **텍스처 ↔ buffer 변환**을 양 끝에 두고, 가운데에서 conv 를 돌립니다. `src/core/cnn.ts` 의 `CnnRunner` 가 이 세 단계(`rgbToFeatures`, `runConv`, `featuresToRgb`)를 제공합니다.

```mermaid
flowchart LR
  TEX["입력 텍스처<br/>(RGB, rgba8)"]
    -->|rgbToFeatures| IN["feature buffer<br/>3채널 (array&lt;f32&gt;)"]
  IN -->|runConv<br/>o = ReLU(Wp+b)| OUT["feature buffer<br/>16채널 (array&lt;f32&gt;)"]
  OUT -->|featuresToRgb<br/>selChannel 선택| OTEX["출력 텍스처<br/>(grayscale, rgba8)"]
  OTEX -->|Blitter.blit| CANVAS["canvas 화면"]
  W["weight·bias buffer<br/>(uploadConvLayer)"] -.->|conv 에 바인딩| OUT
```

각 단계가 하는 일:

1. **`rgbToFeatures(encoder, inputTex, inFeat, W, H)`** — RGB 텍스처를 읽어 **3채널 feature buffer** 로 옮깁니다. (텍스처 → buffer)
2. **`uploadConvLayer(device, layer, W, H)`** — weight(432개)·bias(16개)·파라미터를 **storage buffer 에 한 번 올립니다**. 매 프레임 다시 올리지 않습니다.
3. **`runConv(encoder, conv, inFeat, outFeat)`** — 위 식 $\mathbf{o} = \mathrm{ReLU}(W\mathbf{p}+\mathbf{b})$ 를 모든 픽셀에서 계산해 **3채널 → 16채널** 로 만듭니다. (`conv.wgsl` 실행)
4. **`featuresToRgb(encoder, outFeat, outputTex, W, H, 16, selChannel)`** — 16채널 중 **선택한 채널 하나**를 grayscale 로 출력 텍스처에 씁니다. (buffer → 텍스처)
5. **`Blitter.blit(context, outputTex)`** — 출력 텍스처를 canvas 에 그립니다. (13장과 동일)

우리가 직접 짜는 코드는 **이 함수들을 순서대로 호출하고 buffer 를 연결**하는 것뿐입니다. 셰이더(`conv.wgsl` 등)는 엔진에 이미 들어 있으니 새로 짜지 않습니다. (`solution/main.ts` 의 `render()` 가 정확히 이 5단계입니다.)

### 예시 weight 는 "학습된 게 아니라 손으로 만든 필터"

이 챕터의 16개 filter 는 `model/weights.ts` 에 **사람이 손으로 채운** kernel 입니다. 16장의 메시지 — "filter 마다 강조하는 특징이 다르다" — 를 눈으로 확실히 보려고, 효과가 분명한 익숙한 필터들(15장의 blur/sharpen/edge 등)을 골라 넣었습니다. 예:

| 채널 | filter | 도드라지는 것 |
|---|---|---|
| 0~2 | R / G / B 채널 강조 | 색 채널 분리 |
| 4 / 5 | blur / sharpen | 흐림 / 또렷함 |
| 6~9 | 가로 / 세로 / 두 대각 edge | 방향별 경계 |
| 10 | Laplacian | 전방향 경계 |
| 12 | R−G 대비 | 색 대비 (음수 → ReLU 가 절반 자름) |
| 15 | 어두운 곳 강조 | bias + ReLU 의 상호작용 |

채널을 바꿔 가며 보면, **같은 입력인데 채널마다 전혀 다른 feature map** 이 나오는 것을 직접 확인할 수 있습니다. 이게 16장이 그림으로만 보여준 "filter 16개 → feature map 16장" 입니다.

> **학습이 아닙니다.** 실제 SRCNN/FSRCNN(18·19장)에서는 이 자리에 `bun run make:weights` 로 생성된 **학습된 숫자**가 들어갑니다. 여기서는 학습을 다루지 않으므로, 효과가 명확히 보이는 손으로 만든 필터로 "feature map 이 채널마다 다르다" 만 확인합니다. weight 가 어떻게 학습되는지는 옵셔널 트랙(O3)에서 PyTorch 로 직접 만듭니다.

### 이 한 layer 가 다음 챕터의 building block

이 챕터에서 만든 conv layer 한 장이 **18장 SRCNN, 19장 FSRCNN 의 공통 building block** 입니다 — 두 모델 모두 이 layer 를 kernel 크기·채널 수만 바꿔 여러 번 쌓은 것입니다.

## 완성되면 이런 화면

- **왼쪽 캔버스**: 입력 RGB 테스트 이미지(그라데이션 + 체커보드 + 흰 원).
- **오른쪽 캔버스**: 위쪽 `feature 채널` select 에서 고른 채널의 feature map 한 장(grayscale).
- **채널을 0 → 1 → 2 …** 로 바꾸면 오른쪽 그림이 매번 달라집니다. R/G/B 강조 채널은 색 분포가, edge 채널은 경계선이, blur 채널은 흐릿한 형태가 도드라집니다.
- **stats 패널**: 선택 채널 번호, GPU 시간, 입력 채널 수(3), 출력 채널 수(16).

(완성 화면 스크린샷 자리 — 직접 캡처해 `docs/assets/` 에 넣습니다.)

## 자가 점검 질문

스스로 설명할 수 있는지 확인하세요. (정답 암기가 아니라 "설명할 수 있는가" 입니다)

1. 왜 16채널 feature map 을 `rgba8` 텍스처 한 장에 담을 수 없고, 대신 **storage buffer(`array<f32>`)** 로 다뤄야 하는지 설명해보세요. 그리고 그 buffer 에서 픽셀 $(x, y)$ 의 채널 $c$ 가 어느 인덱스에 있는지 $(y\cdot W + x)\cdot C + c$ 와 연결해 설명해보세요.
2. conv layer 한 장이 한 픽셀에서 하는 일을 $\mathbf{o} = \mathrm{ReLU}(W\mathbf{p} + \mathbf{b})$ 로 적고, 이 챕터의 구체적 크기에서 $\mathbf{p}$, $W$, $\mathbf{b}$, $\mathbf{o}$ 의 차원이 각각 얼마인지(27, 16×27, 16, 16) 왜 그런지 설명해보세요.
3. 색 대비 filter(R−G) 의 출력은 ReLU **이전**에 음수가 나올 수 있습니다. 만약 중간 feature map 을 0~1 로 클램프하는 `unorm` 텍스처에 저장했다면 무엇이 잘못되는지, 그리고 float storage buffer 가 왜 이 문제를 피하는지 설명해보세요.
