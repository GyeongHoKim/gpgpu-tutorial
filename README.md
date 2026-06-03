# WebGPU WGSL GPGPU Tutorial

IDIS Pylon 파트 신입 개발자가 WebGPU와 WGSL을 단계적으로 익혀, 최종적으로 비디오 플레이어용 CNN 기반 Super Resolution(SRCNN·FSRCNN) 데모를 GPU에서 직접 구현하는 실습 튜토리얼입니다.

convolution을 먼저 이미지 필터로 이해하고, CNN을 "그 필터 값이 학습된 것"으로 확장합니다. 각 챕터(`lessons/<번호>/`)는 독립 실행 가능한 예제와 설명 README를 함께 가집니다.

## 빠른 시작

```bash
bun install
bun run dev 13      # 13장 개발 서버 (http://localhost:5173)
```

- WebGPU 지원 브라우저(Chrome/Edge 최신 등)로 엽니다. 챕터는 `bun run dev <번호>`로 실행합니다.
- 실습: 챕터 README로 개념을 읽고 → `src/`의 TODO를 채우고 → 브라우저로 확인 → `solution/`과 비교.
- 테스트: `bun test` (CPU 기준 구현 검증).

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

**Part 7~8. 비디오 플레이어 · 실무** _(작성 예정)_
- 20~22 비디오 프레임 연결·실시간 SR 데모, 23~25 성능·디버깅·실무 제약

**옵셔널 트랙 (PyTorch)**
- [O3. SRCNN/FSRCNN 학습하기](./lessons/optional/O3-train-srcnn-fsrcnn/README.md)
- O1 PyTorch 기초, O2 신경망 학습 기초, O4 GAN 기반 SR 개요 _(작성 예정)_

## 최종 목표

`<video>` 프레임마다 WebGPU compute shader로 SRCNN/FSRCNN 추론을 돌려, 원본과 SR 결과를 실시간 비교하는 플레이어.

```text
video frame → GPU texture → compute shader → convolution → CNN Super Resolution → canvas
```
