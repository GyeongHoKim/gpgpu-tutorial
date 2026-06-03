# 모델 아키텍처 계약 (SRCNN / FSRCNN)

이 문서는 메인 트랙(WebGPU 추론)과 옵셔널 트랙(PyTorch 학습)이 공유하는 **단일 기준**입니다.
학습 스크립트, `scripts/make-weights.ts`, 18·19장 레슨은 모두 이 스펙을 따릅니다. 한쪽을 바꾸면 양쪽을 함께 바꿔야 합니다.

교육용 tiny 버전입니다. 원논문보다 채널이 작지만 구조(레이어 종류·커널)는 충실합니다.

## 공통 규약

- 입력/출력 색: RGB 3채널, 값 범위 `[0, 1]` (정규화).
- 학습/추론 동일 정규화. 어긋나면 결과가 깨진다.
- scale factor: 2x.
- weight export 레이아웃(conv): `[outC][inC][kh][kw]` 순서로 평탄화한 `Float32Array` + `bias[outC]`.
- deconvolution(transposed conv) 레이아웃은 아래 FSRCNN 절에 별도 명시.
- activation: ReLU (FSRCNN 원논문은 PReLU지만 tiny 버전은 단순화를 위해 ReLU 사용).

## SRCNN (18장)

먼저 bilinear로 2x 확대한 뒤(HR 해상도), conv 3개로 복원. residual 없음, HR을 직접 출력.

| 레이어 | 종류 | 커널 | in→out | activation |
|------|------|------|------|------|
| pre | bilinear upscale 2x | — | 3→3 | — |
| conv1 | conv | 9x9 | 3→16 | ReLU |
| conv2 | conv | 1x1 | 16→16 | ReLU |
| conv3 | conv | 5x5 | 16→3 | — (clamp to [0,1]) |

- 경계: clamp-to-edge.
- 출력: conv3 결과를 `[0,1]`로 clamp.

## FSRCNN (19장)

LR 해상도에서 처리하고, 마지막 deconvolution으로 2x 확대.

| 레이어 | 종류 | 커널 | in→out | activation |
|------|------|------|------|------|
| extract | conv | 5x5 | 3→16 | ReLU |
| shrink | conv | 1x1 | 16→8 | — |
| map1 | conv | 3x3 | 8→8 | ReLU |
| map2 | conv | 3x3 | 8→8 | ReLU |
| expand | conv | 1x1 | 8→16 | — |
| deconv | transposed conv | 9x9, stride 2 | 16→3 | — (clamp to [0,1]) |

- 경계: clamp-to-edge (conv), deconv는 stride 2 / padding 으로 출력이 정확히 2x가 되게.
- deconv weight export 레이아웃: `[inC][outC][kh][kw]` (PyTorch `ConvTranspose2d.weight` 와 동일) + `bias[outC]`. conv와 in/out 순서가 다름에 주의.
- deconvolution은 checkerboard artifact를 만들 수 있다(19장에서 다룸).

## 파일 매핑

- checkpoint: `model/srcnn.checkpoint`, `model/fsrcnn.checkpoint`
- 변환 산출물: `lessons/18-srcnn-super-resolution/model/srcnn-weights.ts`,
  `lessons/19-fsrcnn-super-resolution/model/fsrcnn-weights.ts`
- 변환: `bun run make:weights` (Python 불필요, 변환만)
- 학습: `lessons/optional/O3-train-srcnn-fsrcnn/` (PyTorch, `.venv` 필요)
