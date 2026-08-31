# WebGPU WGSL GPGPU Tutorial

IDIS Pylon 파트 신입 개발자가 WebGPU와 WGSL을 단계적으로 익혀, 최종적으로 비디오 플레이어용 CNN 기반 Super Resolution(SRCNN·FSRCNN) 데모를 GPU에서 직접 구현하는 실습 튜토리얼입니다.

convolution을 먼저 이미지 필터로 이해하고, CNN을 "그 필터 값이 학습된 것"으로 확장합니다. 각 챕터(`lessons/<번호>/`)는 독립 실행 가능한 예제와 설명 README를 함께 가집니다.

## 빠른 시작

```bash
bun install
bun run dev 13      # 13장 개발 서버 (http://localhost:5173)
```

- WebGPU 지원 브라우저로 엽니다(아래 "브라우저 요구사항" 참고). 챕터는 `bun run dev <번호>`로 실행합니다.
- 실습: 챕터 README로 개념을 읽고 → `src/`의 TODO를 채우고 → 브라우저로 확인 → `solution/`과 비교.
- 테스트: `bun test` (CPU 기준 구현 검증).
- 비디오 챕터(20~22)는 샘플 영상 `public/videos/sample.mp4`(저장소 포함)를 씁니다. 다시 만들려면 `bun run make:video`(ffmpeg 필요).

## 브라우저 요구사항

WebGPU 는 2026년 1월에 **Baseline**(주요 브라우저가 공통으로 지원하는 상태)에 도달했습니다. 아래 버전 이상이면 이 튜토리얼의 모든 챕터가 동작합니다.

| 브라우저 | 지원 버전 |
|---|---|
| Chrome · Edge | 113+ (데스크톱), 121+ (Android), Linux 는 144+ (Intel Gen12+) / 147+ (NVIDIA) |
| Safari | 26+ (macOS Tahoe 26 · iOS 26 · iPadOS 26 · visionOS 26) |
| Firefox | 141+ (Windows), 145+ (Apple Silicon macOS), 147+ (전체 macOS) |

- 아직 남아 있는 공백은 **Linux 의 Firefox** 와 **A12 이전 세대 iPhone** 입니다. 이 환경에서는 `navigator.gpu` 가 `undefined` 입니다.
- WebGPU 는 **보안 컨텍스트**에서만 동작합니다. `https` 또는 `http://localhost` 로 여세요. `bun run dev` 가 띄우는 `http://localhost:5173` 은 조건을 만족합니다.
- 지원 여부가 헷갈리면 `bun run check:webgpu` 로 확인 방법을 볼 수 있습니다.
- 20~22장의 비디오 챕터는 `requestVideoFrameCallback` 을 씁니다. 이 API 는 Chrome 83+, Safari 15.4+, Firefox 132+ 에서 지원되므로 위 WebGPU 요구 버전을 만족하면 함께 충족됩니다.

## 스택 · 구조

- **Bun** + **WGSL 직접 작성**(GPGPU 라이브러리 없음) + **네이티브 Web Component** + TypeScript.
- 공통 코드 `src/`(core·math·ui), 챕터 `lessons/`, 학습 스크립트 `lessons/optional/`.
- 작성·기여 규약: [`CLAUDE.md`](./CLAUDE.md) · 용어집: [`docs/glossary.md`](./docs/glossary.md)

## 학습 트랙

- **메인 트랙** (`lessons/`): WebGPU/WGSL 쉐이더와 GPU 추론. Python 불필요.
- **옵셔널 트랙** (`lessons/optional/`): PyTorch로 SR 모델을 직접 학습해 메인 트랙 weight를 만든다.

## 챕터 (TOC)

각 항목은 해당 챕터의 README 링크입니다.

**Part 1. 왜 GPU로 계산하는가**
- [01. GPGPU와 WebGPU의 목적](./lessons/01-gpgpu-overview/README.md)
- [02. HTML5 Video Player 파이프라인 개요](./lessons/02-video-frame-pipeline/README.md)

**Part 2. 픽셀과 이미지 처리 기초**
- [03. 픽셀 데이터 이해](./lessons/03-pixel-data/README.md)
- [04. CPU로 먼저 만드는 이미지 처리](./lessons/04-cpu-image-filters/README.md)
- [05. Convolution의 의미](./lessons/05-cpu-convolution/README.md)

**Part 3. WebGPU 입문**
- [06. WebGPU 초기화](./lessons/06-webgpu-init/README.md)
- [07. Buffer와 Texture](./lessons/07-buffer-and-texture/README.md)
- [08. Bind Group과 Pipeline](./lessons/08-bind-group-and-pipeline/README.md)

**Part 4. WGSL 문법**
- [09. WGSL 기본 문법](./lessons/09-wgsl-basics/README.md)
- [10. WGSL 주소 공간과 바인딩](./lessons/10-wgsl-bindings/README.md)
- [11. Compute Shader 기초](./lessons/11-compute-shader-basics/README.md)
- [12. WGSL에서 Texture 읽고 쓰기](./lessons/12-texture-load-store/README.md)

**Part 5. GPU 이미지 필터**
- [13. GPU Grayscale (파일럿)](./lessons/13-gpu-basic-filters/README.md)
- [14. GPU Bilinear Upscale](./lessons/14-gpu-bilinear-upscale/README.md)
- [15. GPU Convolution Filter](./lessons/15-gpu-convolution/README.md)

**Part 6. CNN Super Resolution**
- [16. CNN을 이미지 필터 관점에서 (개념)](./lessons/16-cnn-as-filters/README.md)
- [17. 최소 CNN Layer 1개 구현](./lessons/17-single-cnn-layer/README.md)
- [18. SRCNN Super Resolution](./lessons/18-srcnn-super-resolution/README.md)
- [19. FSRCNN Super Resolution](./lessons/19-fsrcnn-super-resolution/README.md)

**Part 7. 비디오 플레이어 연결**
- [20. 정지 이미지에서 비디오 프레임으로](./lessons/20-video-frame-input/README.md)
- [21. requestVideoFrameCallback 통합](./lessons/21-request-video-frame-callback/README.md)
- [22. 실시간 Super Resolution 데모 (캡스톤)](./lessons/22-realtime-sr-player/README.md)

**Part 8. 실무 감각**
- [23. 성능 최적화 기초](./lessons/23-performance/README.md)
- [24. 디버깅 방법](./lessons/24-debugging/README.md) · 참조: [`docs/webgpu-debugging.md`](./docs/webgpu-debugging.md)
- [25. 회사 비디오 플레이어로 가기 전에](./lessons/25-company-player/README.md)

**옵셔널 트랙 (PyTorch)**
- [O1. PyTorch 환경과 기초](./lessons/optional/O1-pytorch-setup/README.md)
- [O2. 신경망 학습 기초](./lessons/optional/O2-nn-and-training-basics/README.md)
- [O3. SRCNN/FSRCNN 학습하기](./lessons/optional/O3-train-srcnn-fsrcnn/README.md)
- [O4. GAN 기반 Super Resolution 개요](./lessons/optional/O4-gan-sr-overview/README.md)

## 최종 목표

`<video>` 프레임마다 WebGPU compute shader로 SRCNN/FSRCNN 추론을 돌려, 원본과 SR 결과를 실시간 비교하는 플레이어.

```text
video frame → GPU texture → compute shader → convolution → CNN Super Resolution → canvas
```
