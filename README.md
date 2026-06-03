# WebGPU WGSL GPGPU Tutorial

이 저장소는 IDIS Pylon 파트의 웹 개발자가 WebGPU와 WGSL을 단계적으로 익히고, 최종적으로 HTML5 Video Player에 들어갈 수 있는 최소 CNN 기반 Super Resolution 데모를 직접 구현해보는 튜토리얼입니다.

목표는 복잡한 딥러닝 모델을 처음부터 학습시키는 것이 아닙니다. 픽셀 처리, GPU 병렬 계산, WGSL 문법, compute shader, convolution, 아주 작은 CNN 추론 로직을 순서대로 쌓아서 비디오 프레임마다 WebGPU로 Super Resolution을 실행하는 구조를 이해하는 것입니다.

## 최종 목표

최종 챕터에서는 다음 기능을 가진 데모를 만듭니다.

- HTML5 `<video>` 기반 비디오 플레이어
- `requestVideoFrameCallback`을 이용한 프레임 단위 처리
- WebGPU compute shader 기반 이미지 처리
- WGSL로 작성한 최소 CNN Super Resolution 추론
- 원본 영상과 처리 결과 비교
- Super Resolution on/off 전환
- FPS 및 GPU 처리 시간 표시

## 대상 독자

이 튜토리얼은 다음 수준의 개발자를 기준으로 작성합니다.

- TypeScript 기본 문법을 알고 있음
- HTML, CSS, `<canvas>`, `<video>`를 사용해본 적이 있음
- GPU 프로그래밍 경험은 없음
- 딥러닝 모델 구현 경험은 없음
- 셰이더 언어 경험은 없음

따라서 모든 개념은 다음 순서로 설명합니다.

```text
픽셀 하나 바꾸기
-> 주변 픽셀 읽기
-> 3x3 필터 적용하기
-> 여러 개의 필터 적용하기
-> ReLU 붙이기
-> 여러 레이어 연결하기
-> 비디오 프레임마다 실행하기
```

## 핵심 학습 원칙

CNN Super Resolution을 처음부터 "딥러닝"으로 설명하지 않습니다.

먼저 convolution을 이미지 필터로 이해합니다. blur, sharpen, edge detection 같은 필터를 직접 구현한 뒤, CNN의 convolution layer를 다음과 같이 연결해서 설명합니다.

> CNN의 convolution layer는 여러 개의 이미지 필터를 동시에 적용하는 구조이고, 그 필터 값이 사람이 직접 정한 값이 아니라 학습된 weight라는 차이가 있다.

이 관점으로 접근하면 WebGPU compute shader와 CNN 추론 로직을 하나의 연속된 이미지 처리 파이프라인으로 이해할 수 있습니다.

## 트랙 구성: 메인과 옵셔널

이 튜토리얼은 두 개의 트랙으로 나뉩니다.

- **메인 트랙 (`lessons/`)**: WebGPU와 WGSL, 즉 **쉐이더 프로그래밍과 GPU 추론**에 집중합니다. CNN은 "이미 학습된 weight를 GPU에서 추론한다"는 관점으로만 다루고, weight는 스크립트 한 줄로 생성합니다.

  ```bash
  bun run make:weights   # 미리 학습된 checkpoint를 weights.ts로 변환 (Python 불필요)
  ```

  이 스크립트는 학습을 하지 않고 **변환만** 하므로 즉시 끝나며, 메인 트랙을 진행하는 데 PyTorch나 Python 환경이 필요 없습니다.

- **옵셔널 트랙 (`lessons/optional/`)**: 신경망 개념과 PyTorch 학습을 다룹니다. weight가 어디서 오는지 궁금하거나, 회사 업무를 위해 PyTorch를 익혀야 하는 사람이 봅니다. **메인 트랙에서 쓰는 바로 그 weight를 직접 학습해서 만들어 봅니다.**

두 트랙은 다음 계약을 공유하므로, 옵셔널 트랙에서 직접 학습한 결과를 메인 트랙에 그대로 끼울 수 있습니다.

- **아키텍처 스펙**: `RGB -> 8 -> 8 -> RGB residual`, 3x3 convolution, ReLU (18장 구조와 동일)
- **export 포맷**: weight 텐서 순서 `[outC][inC][kh][kw]` + bias, 입력은 `[0,1]` 정규화
- **연결 경로**: 옵셔널에서 학습한 checkpoint를 `model/`에 넣고 `bun run make:weights`를 다시 실행하면 메인 레슨이 그 모델로 동작

권장 순서는 **메인 트랙을 먼저 끝내는 것**입니다. 쉐이더로 결과를 먼저 보면 동기부여가 되고 GPU 쪽 그림이 잡힌 상태에서 학습을 이해하기 쉽습니다. 다만 신경망이 궁금하면 16장 전에 옵셔널 트랙을 먼저 봐도 됩니다.

## 챕터 구성

### Part 1. 왜 GPU로 계산하는가

#### 1. GPGPU와 WebGPU의 목적

- GPU가 그래픽뿐 아니라 일반 계산에도 사용되는 이유
- CPU 반복문과 GPU 병렬 처리의 차이
- WebGPU가 브라우저에서 제공하는 역할
- 비디오 플레이어에서 Super Resolution이 필요한 이유

#### 2. HTML5 Video Player 파이프라인 개요

- `<video>` 요소
- `<canvas>` 출력
- `requestVideoFrameCallback`
- 비디오 프레임을 GPU texture로 복사하는 흐름
- 프레임 하나를 받아 처리한 뒤 화면에 그리는 전체 구조

### Part 2. 픽셀과 이미지 처리 기초

#### 3. 픽셀 데이터 이해

- RGB와 RGBA
- 0부터 255 사이의 정수 색상
- 0부터 1 사이의 float 색상
- 이미지 좌표계
- pixel, texel, UV 좌표의 차이

#### 4. CPU로 먼저 만드는 이미지 처리

- grayscale
- invert
- brightness
- nearest-neighbor upscale
- bilinear upscale
- CPU 구현과 GPU 구현을 비교하기 위한 기준 만들기

#### 5. Convolution의 의미

- 3x3 kernel
- blur
- sharpen
- edge detection
- padding과 clamp
- 주변 픽셀을 읽어서 현재 픽셀을 계산하는 방식

### Part 3. WebGPU 입문

#### 6. WebGPU 초기화

- `GPUAdapter`
- `GPUDevice`
- `GPUQueue`
- `GPUCanvasContext`
- texture format
- render pass와 compute pass의 차이

#### 7. Buffer와 Texture

- `GPUBuffer`
- `GPUTexture`
- uniform buffer
- storage buffer
- sampled texture
- storage texture
- buffer를 써야 하는 경우와 texture를 써야 하는 경우

#### 8. Bind Group과 Pipeline

- bind group layout
- bind group
- pipeline layout
- render pipeline
- compute pipeline
- WebGPU 코드가 장황해 보이는 이유

### Part 4. WGSL 문법

#### 9. WGSL 기본 문법

- `let`
- `var`
- `f32`, `i32`, `u32`, `bool`
- `vec2f`, `vec3f`, `vec4f`
- 함수 선언
- 타입 변환
- JavaScript 값과 WGSL 값의 차이

#### 10. WGSL 주소 공간과 바인딩

- `@group`
- `@binding`
- `var<uniform>`
- `var<storage>`
- `texture_2d`
- `texture_storage_2d`
- `sampler`

#### 11. Compute Shader 기초

- `@compute`
- `@workgroup_size`
- `@builtin(global_invocation_id)`
- workgroup
- invocation
- dispatch 크기 계산
- 픽셀 하나당 invocation 하나를 배정하는 모델

#### 12. WGSL에서 Texture 읽고 쓰기

- `textureLoad`
- `textureStore`
- 좌표 범위 체크
- clamp 처리
- 입력 texture와 출력 texture 분리

### Part 5. GPU 이미지 필터 만들기

#### 13. GPU Grayscale 및 Invert

- 가장 단순한 compute shader 작성
- 입력 texture 읽기
- 출력 texture 쓰기
- CPU 결과와 GPU 결과 비교

#### 14. GPU Bilinear Upscale

- 2x upscale
- 출력 픽셀에서 원본 좌표 역산
- 주변 4개 픽셀 샘플링
- 선형 보간
- Super Resolution 전에 이해해야 하는 기본 확대 방식

#### 15. GPU Convolution Filter

- WGSL로 3x3 convolution 구현
- blur와 sharpen 구현
- 경계 픽셀 처리
- texture read 횟수와 성능의 관계

### Part 6. CNN을 아주 작게 이해하기

#### 16. CNN을 이미지 필터 관점에서 설명

- convolution layer
- input channel
- output channel
- weight
- bias
- activation
- feature map
- 학습이 아니라 추론만 다루는 이유

> weight가 사람이 정한 값이 아니라 "학습된 값"이라는 점만 여기서 짚고 넘어갑니다. 실제로 어떻게 학습되는지는 옵셔널 트랙(O1~O3)에서 PyTorch로 직접 다룹니다.

#### 17. 최소 CNN Layer 1개 구현

- RGB 입력
- 3x3 convolution
- 3 input channels에서 8 feature channels로 변환
- ReLU
- weight와 bias를 storage buffer에 저장
- 중간 feature map 저장

> 여기서 쓰는 weight는 `bun run make:weights`로 생성된 값입니다. 이 숫자들이 어디서 왔는지 궁금하면 옵셔널 트랙(O3)에서 직접 학습해 만들 수 있습니다.

#### 18. 최소 CNN Super Resolution

권장 구조는 다음과 같습니다.

```text
low-resolution RGB frame
-> bilinear 2x upscale
-> Conv 3x3, RGB -> 8 channels
-> ReLU
-> Conv 3x3, 8 channels -> 8 channels
-> ReLU
-> Conv 3x3, 8 channels -> RGB residual
-> output = bilinear result + residual
```

이 구조는 실제 고성능 Super Resolution 모델보다 훨씬 작지만, SR의 핵심 아이디어를 설명하기에 충분합니다.

핵심 개념은 다음과 같습니다.

- bilinear upscale은 기본 확대 결과를 만든다.
- CNN은 확대된 이미지 위에 추가 디테일을 보정한다.
- 마지막 레이어는 완성 이미지를 직접 만들기보다 residual을 만든다.
- 최종 출력은 기본 확대 이미지와 residual을 더한 결과다.

### Part 7. Video Player에 연결

#### 19. 정지 이미지에서 비디오 프레임으로 확장

- 이미지 파일 대신 `<video>` 프레임 사용
- 매 프레임 GPU texture 갱신
- texture 재사용
- 처리 결과를 canvas에 출력

#### 20. `requestVideoFrameCallback` 통합

- 콜백 등록 방식
- 프레임 타임스탬프
- 재생, 일시정지, seek 처리
- GPU 작업이 늦을 때 프레임을 스킵하는 전략
- 매 프레임 새 객체를 만들지 않는 구조

#### 21. 실시간 Super Resolution 데모

- 원본과 SR 결과 비교
- split view
- SR on/off toggle
- scale factor 선택
- FPS 표시
- GPU 처리 시간 표시
- 브라우저별 동작 확인

### Part 8. 실무 감각

#### 22. 성능 최적화 기초

- texture read 횟수 줄이기
- workgroup size 선택
- intermediate texture 재사용
- pipeline과 bind group 캐싱
- 프레임마다 생성하면 안 되는 객체 구분
- GPU 처리 시간이 프레임 예산을 넘는 경우 대응

#### 23. 디버깅 방법

- shader compile error 읽기
- 검은 화면 원인 찾기
- texture size mismatch
- bind group mismatch
- out-of-bounds 좌표
- CPU fallback으로 결과 검증

#### 24. 회사 비디오 플레이어로 가기 전에 알아야 할 것

- RGB와 YUV
- 색공간
- HDR과 SDR
- 동영상 해상도 변경
- device lost
- 브라우저 지원 범위
- 모바일 GPU 성능 차이
- GAN 기반 SR과의 관계 (회사 모델이 GAN이어도 추론은 Generator=CNN, O4 참고)

## 옵셔널 트랙: 신경망과 PyTorch

옵셔널 트랙은 메인 트랙에서 "스크립트로 생성된다"고 넘어갔던 weight가 실제로 어떻게 만들어지는지를 다룹니다. 회사 업무에서 결국 필요한 PyTorch와 신경망 학습 개념을 여기서 익히고, **메인 트랙에서 사용하는 weight를 직접 학습해서 만들어 봅니다.**

이 트랙은 GPU 프로그래밍이 아니라 딥러닝이 주제이므로, 메인 트랙과 분리해 원할 때 진행합니다.

### Part O. 신경망과 학습 (옵셔널)

#### O1. PyTorch 환경과 기초

- Python과 PyTorch 설치
- tensor의 개념
- 메인 트랙에서 본 `vec`/배열과 tensor의 관계
- autograd와 backpropagation의 직관적 이해
- GPU 학습과 CPU 학습의 차이

#### O2. 신경망 학습 기초

- loss function
- gradient descent
- epoch, batch, learning rate
- 학습이란 weight를 조금씩 고치는 과정이라는 관점
- 메인 트랙의 convolution이 학습 가능한 레이어가 되는 방식

#### O3. tiny SR 모델 학습하기

- 메인 트랙과 동일한 아키텍처 (`RGB -> 8 -> 8 -> RGB residual`)
- 저해상/고해상 이미지 쌍으로 학습 데이터 만들기
- residual learning으로 학습시키기
- 학습된 모델을 checkpoint로 저장
- export 포맷 (`[outC][inC][kh][kw]` + bias)에 맞춰 내보내기
- `model/`에 넣고 `bun run make:weights`로 메인 레슨에 연결
- 내가 학습한 weight로 메인 트랙 SR 데모가 동작하는지 확인

#### O4. GAN 기반 Super Resolution 개요

- SRGAN과 ESRGAN의 핵심 아이디어
- GAN은 학습 기법이고, 추론 때는 Generator만 돈다는 점
- ESRGAN Generator가 결국 더 깊은 CNN이라는 점
- 메인 트랙에서 만든 CNN 추론이 회사 GAN 모델 추론과 같은 원리인 이유
- 회사 모델로 넘어가기 위한 다음 학습 방향

## 예제 디렉터리 제안

각 챕터는 `lessons/` 아래에 독립 실행 가능한 작은 예제로 구성합니다. 챕터 번호와 폴더 이름은 다음과 같이 대응합니다. (전체 폴더 구조는 아래 "프로젝트 폴더 구성"을 참고하세요.)

```text
lessons/
  01-gpgpu-overview/
  02-video-frame-pipeline/
  03-pixel-data/
  04-cpu-image-filters/
  05-cpu-convolution/
  06-webgpu-init/
  07-buffer-and-texture/
  08-bind-group-and-pipeline/
  09-wgsl-basics/
  10-wgsl-bindings/
  11-compute-shader-basics/
  12-texture-load-store/
  13-gpu-basic-filters/
  14-gpu-bilinear-upscale/
  15-gpu-convolution/
  16-cnn-as-filters/
  17-single-cnn-layer/
  18-minimal-cnn-sr/
  19-video-frame-input/
  20-request-video-frame-callback/
  21-realtime-sr-player/

  optional/
    O1-pytorch-setup/
    O2-nn-and-training-basics/
    O3-train-tiny-sr/
    O4-gan-sr-overview/
```

## 권장 구현 방식

이 튜토리얼은 처음부터 TypeScript로 작성합니다. 별도의 빌드 도구나 UI 프레임워크 없이, 표준 웹 플랫폼과 WebGPU에만 집중하기 위해 다음 스택으로 통일합니다.

- 런타임 / 패키지 매니저 / 테스트 러너 / 번들러: **Bun**
- UI: **네이티브 Web Component** (`customElements`) — Lit 같은 라이브러리를 쓰지 않음
- 언어: **TypeScript** (Bun이 별도 빌드 스텝 없이 바로 실행)
- GPGPU: WebGPU + WGSL 직접 작성 (tgpu 같은 라이브러리를 쓰지 않음)

회사 실제 코드는 Lit 기반 Web Component를 쓰지만, Lit도 결국 표준 Web Component 위에 얹힌 것이므로 네이티브 Web Component를 먼저 이해하면 회사 스택으로 자연스럽게 넘어갈 수 있습니다.

권장 흐름은 다음과 같습니다.

1. CPU에서 같은 기능을 먼저 구현합니다.
2. WebGPU compute shader로 옮깁니다.
3. CPU 결과와 GPU 결과를 비교합니다.
4. 정지 이미지에서 동작시킵니다.
5. 비디오 프레임으로 확장합니다.
6. 마지막에 CNN Super Resolution 파이프라인으로 합칩니다.

WGSL은 결국 문자열이고, `device.createShaderModule({ code })`가 문자열을 받습니다. 따라서 `.wgsl` 파일을 표준 import attributes로 불러옵니다. (`?raw`는 Vite 전용 문법이라 이 프로젝트에서는 쓰지 않습니다.)

```ts
import grayscaleWGSL from "./shaders/grayscale.wgsl" with { type: "text" };

const module = device.createShaderModule({ code: grayscaleWGSL });
```

매번 `with { type: "text" }`를 붙이기 싫다면 `bunfig.toml`에서 `.wgsl`을 text loader로 지정해 둘 수도 있습니다.

초반 챕터에서는 인라인 템플릿 리터럴(`` const code = /* wgsl */ `...` ``)로 "쉐이더는 문자열일 뿐"을 먼저 체감한 뒤, 이후 챕터부터 `.wgsl` 파일로 분리합니다.

## 브라우저 요구사항

WebGPU를 지원하는 최신 브라우저가 필요합니다.

- Chrome
- Edge
- Safari Technology Preview 또는 WebGPU 지원 Safari

브라우저와 운영체제에 따라 WebGPU 지원 상태가 다를 수 있으므로, 튜토리얼 시작 전에 `navigator.gpu` 존재 여부를 확인합니다.

```js
if (!navigator.gpu) {
  throw new Error("WebGPU is not supported in this browser.");
}
```

## 구현할 최소 SR 모델의 범위

이 저장소의 CNN Super Resolution은 교육용 최소 구현입니다.

메인 트랙에 포함하는 것:

- 2x upscale
- RGB 입력
- 3x3 convolution
- ReLU
- residual output
- WGSL 기반 추론
- 비디오 프레임 단위 실행

옵셔널 트랙에 포함하는 것:

- 모델 학습 (PyTorch, tiny SR 아키텍처)
- 메인 트랙에서 쓰는 weight를 직접 만들기
- GAN 기반 SR(SRGAN/ESRGAN) 개념 개요

어느 트랙에도 포함하지 않는 것:

- 대형 SR 모델
- 고품질 실서비스 수준 weight
- GAN 모델의 본격적 학습 (개념 개요까지만)
- YUV 파이프라인 최적화
- 플랫폼별 하드웨어 최적화
- WebNN 또는 WASM backend

## 학습 완료 후 기대 수준

이 튜토리얼을 마치면 다음을 설명하고 구현할 수 있어야 합니다.

- WebGPU 초기화 흐름
- WGSL compute shader 기본 문법
- texture를 읽고 쓰는 방식
- workgroup과 invocation의 의미
- GPU에서 이미지 필터를 실행하는 방식
- convolution이 CNN layer로 확장되는 방식
- 작은 CNN 추론을 WGSL로 구현하는 방식
- `requestVideoFrameCallback`으로 비디오 프레임마다 GPU 작업을 실행하는 방식
- 실무 비디오 플레이어에 SR 로직을 넣을 때 고려해야 할 제약

## 가장 중요한 관점

이 튜토리얼의 핵심은 WebGPU와 CNN을 따로 배우는 것이 아닙니다.

다음 하나의 흐름으로 이해하는 것이 목표입니다.

```text
video frame
-> GPU texture
-> compute shader
-> image filter
-> convolution layer
-> tiny CNN Super Resolution
-> canvas output
```

이 흐름을 이해하면 더 복잡한 Super Resolution 모델이나 회사 비디오 플레이어의 실제 렌더링 파이프라인도 훨씬 쉽게 읽을 수 있습니다.

## 프로젝트 폴더 구성

이 저장소는 문서이면서 동시에 실습 프로젝트여야 합니다. 따라서 각 챕터는 독립적으로 실행 가능한 예제와 설명 문서를 함께 가집니다.

권장 폴더 구조는 다음과 같습니다.

```text
gpgpu-tutorial/
  README.md
  package.json
  bunfig.toml
  tsconfig.json
  wgsl.d.ts

  docs/
    00-roadmap.md
    glossary.md
    web-component-basics.md
    webgpu-debugging.md
    cnn-super-resolution.md
    gan-sr-overview.md
    pytorch-and-training.md
    video-pipeline.md

  src/
    core/
      webgpu.ts
      texture.ts
      buffer.ts
      pipeline.ts
      video-frame.ts
      gpu-timer.ts
    math/
      color.ts
      convolution.ts
      upscale.ts
    ui/
      lesson-shell.ts
      controls.ts
      split-view.ts
      stats-panel.ts

  lessons/
    01-gpgpu-overview/
      README.md
      exercise.md
      index.html
      src/
        main.ts

    02-video-frame-pipeline/
      README.md
      exercise.md
      index.html
      src/
        main.ts

    03-pixel-data/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      solution/
        main.ts

    04-cpu-image-filters/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      solution/
        main.ts

    05-cpu-convolution/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      solution/
        main.ts

    06-webgpu-init/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      solution/
        main.ts

    07-buffer-and-texture/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        copy.wgsl
      solution/

    08-bind-group-and-pipeline/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        compute.wgsl
      solution/

    09-wgsl-basics/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        basics.wgsl
      solution/

    10-wgsl-bindings/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        bindings.wgsl
      solution/

    11-compute-shader-basics/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        compute.wgsl
      solution/

    12-texture-load-store/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        texture-load-store.wgsl
      solution/

    13-gpu-basic-filters/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        grayscale.wgsl
        invert.wgsl
      solution/

    14-gpu-bilinear-upscale/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        bilinear-upscale.wgsl
      solution/

    15-gpu-convolution/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        convolution-3x3.wgsl
      solution/

    16-cnn-as-filters/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      solution/

    17-single-cnn-layer/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        conv-rgb-to-features.wgsl
      model/
        weights.ts
      solution/

    18-minimal-cnn-sr/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        bilinear-upscale.wgsl
        conv-rgb-to-features.wgsl
        conv-features.wgsl
        conv-features-to-rgb.wgsl
        compose-residual.wgsl
      model/
        weights.ts
      solution/

    19-video-frame-input/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        copy-frame.wgsl
      solution/

    20-request-video-frame-callback/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        copy-frame.wgsl
      solution/

    21-realtime-sr-player/
      README.md
      exercise.md
      index.html
      src/
        main.ts
      shaders/
        bilinear-upscale.wgsl
        conv-rgb-to-features.wgsl
        conv-features.wgsl
        conv-features-to-rgb.wgsl
        compose-residual.wgsl
      model/
        weights.ts
      solution/

    optional/
      O1-pytorch-setup/
        README.md
        exercise.md
      O2-nn-and-training-basics/
        README.md
        exercise.md
      O3-train-tiny-sr/
        README.md
        exercise.md
        train.py
        export-checkpoint.py
      O4-gan-sr-overview/
        README.md

  model/
    tiny-sr.checkpoint
    architecture.md

  public/
    images/
      checkerboard.png
      gradient.png
      text-small.png
    videos/
      sample-360p.mp4
      sample-480p.mp4

  scripts/
    create-lesson.ts
    check-webgpu-support.ts
    make-weights.ts

  tests/
    cpu/
      convolution.test.ts
      upscale.test.ts
    fixtures/
      expected/
```

각 폴더의 역할은 다음과 같습니다.

- `docs/`: 챕터와 독립적으로 다시 찾아볼 수 있는 참조 문서
- `src/core/`: 여러 챕터에서 공유하는 WebGPU 초기화, texture, buffer, pipeline, video frame 유틸리티
- `src/math/`: CPU 기준 구현과 테스트 가능한 수학/이미지 처리 로직
- `src/ui/`: lesson 화면, 컨트롤, split view, 통계 패널 같은 공통 UI (네이티브 Web Component로 구현, 신입은 가져다 쓰기만 함)
- `lessons/`: 메인 트랙. 실제 학습 흐름을 담당하는 챕터별 실습
- `lessons/optional/`: 옵셔널 트랙. PyTorch와 신경망 학습 (메인 트랙의 weight를 직접 만드는 곳)
- `lessons/*/README.md`: 해당 챕터의 개념 설명
- `lessons/*/exercise.md`: 신입 개발자가 직접 채워 넣을 실습 과제
- `lessons/*/src/`: 미완성 또는 단계별 실습 코드
- `lessons/*/solution/`: 실습 후 비교할 수 있는 정답 코드
- `lessons/*/shaders/`: 해당 챕터에서 사용하는 WGSL shader
- `lessons/*/model/`: 해당 챕터에서 사용하는 weight, bias (`make:weights`로 생성)
- `model/`: 미리 학습된 기본 checkpoint와 아키텍처 스펙. 메인↔옵셔널 트랙의 계약 기준
- `public/`: 모든 예제에서 공유하는 이미지와 비디오 샘플
- `scripts/`: lesson 생성, 지원 환경 확인, weight 생성(`make-weights.ts`) 같은 보조 스크립트
- `tests/`: CPU 기준 구현과 핵심 수학 로직 테스트

운영 원칙은 단순합니다.

```text
한 챕터에서 설명하는 개념은 반드시 같은 폴더 안에서 실행 가능한 코드로 확인할 수 있어야 한다.
```

## 부록 A. React 개발자를 위한 Web Component 입문

대부분의 신입은 React에 익숙하지만 이 튜토리얼은 네이티브 Web Component를 씁니다. 새 프레임워크를 배우는 게 아니라, React가 내부적으로 대신 해주던 일을 브라우저 표준 API로 직접 한다고 생각하면 됩니다. 핵심 대응 관계는 다음과 같습니다.

| React | 네이티브 Web Component |
|------|------|
| 컴포넌트 정의 (function/class) | `class X extends HTMLElement` + `customElements.define("x-panel", X)` |
| 마운트 시점 (`useEffect(() => {}, [])`) | `connectedCallback()` |
| 언마운트 정리 (effect cleanup) | `disconnectedCallback()` |
| props | HTML attribute 또는 JS property |
| props 변경 감지 | `static observedAttributes` + `attributeChangedCallback()` |
| state + 자동 리렌더 | **없음.** DOM을 직접 갱신 (`el.textContent = ...`) |
| JSX | 템플릿 리터럴 / `document.createElement` / `<template>` |
| CSS Module / styled | Shadow DOM 안의 `<style>` |
| `children` | `<slot>` |
| `ref` | `this`(엘리먼트 자신) 또는 `this.querySelector()` |
| `onClick={fn}` | `addEventListener("click", fn)` |
| 부모로 이벤트 올리기 | `this.dispatchEvent(new CustomEvent("change", { detail }))` |

가장 큰 차이는 **Virtual DOM도, 자동 리렌더도 없다**는 점입니다. 값이 바뀌면 내가 직접 DOM을 고쳐야 합니다. 번거로워 보이지만, 매 프레임 갱신되는 FPS·GPU 시간 패널 같은 경우엔 오히려 `textContent` 한 줄이 프레임워크 리렌더보다 단순하고 빠릅니다.

최소 예시:

```ts
class StatsPanel extends HTMLElement {
  private fpsEl = document.createElement("span");

  connectedCallback() {       // React의 mount
    this.append("FPS: ", this.fpsEl);
  }
  setFps(v: number) {         // 직접 갱신, 리렌더 없음
    this.fpsEl.textContent = v.toFixed(1);
  }
}
customElements.define("stats-panel", StatsPanel);
```

```html
<stats-panel></stats-panel>
```

더 깊은 내용은 `docs/web-component-basics.md`(커스텀 엘리먼트, Shadow DOM, slot, lifecycle, CustomEvent)에서 다룹니다. 회사 코드에서 쓰는 Lit은 이 표준 위에 reactive property와 템플릿 문법을 얹은 것이므로, 이 부록을 이해하면 Lit 코드도 읽을 수 있습니다.

## 부록 B. 튜토리얼 프로젝트 실행 방법

### 사전 준비

- **Bun 설치**: `curl -fsSL https://bun.sh/install | bash` (macOS/Linux). 설치 후 `bun --version`으로 확인.
- **WebGPU 지원 브라우저**: Chrome, Edge, 또는 WebGPU 지원 Safari. 시작 전에 주소창에 접속한 페이지에서 `navigator.gpu`가 존재하는지 확인합니다.
- **메인 트랙은 Python/PyTorch가 필요 없습니다.** Python은 옵셔널 트랙(O1~O3)에서 직접 학습할 때만 필요합니다.

### 처음 한 번

```bash
bun install            # 의존성 설치
bun run check:webgpu   # WebGPU 지원 환경인지 확인 (scripts/check-webgpu-support)
bun run make:weights   # checkpoint -> weights.ts 변환 (CNN 챕터에서 사용, 즉시 완료)
```

### 챕터 실습

각 lesson은 독립 실행됩니다. 개발 서버를 띄우고 해당 챕터의 `index.html`을 엽니다.

```bash
bun run dev            # 로컬 개발 서버 실행
```

실습 순서는 다음과 같습니다.

1. `lessons/NN-.../README.md`로 개념을 읽습니다.
2. `lessons/NN-.../exercise.md`의 과제를 `src/`에서 직접 구현합니다.
3. 브라우저에서 결과를 확인합니다.
4. 막히거나 다 풀면 `solution/`과 비교합니다.

### 테스트

CPU 기준 구현(`src/math/`)은 단위 테스트로 검증합니다.

```bash
bun test               # tests/cpu/*.test.ts 실행
```

> GPU 코드는 브라우저에서 눈과 CPU 결과 비교로 검증하고, 순수 수학/이미지 로직만 `bun test`로 자동 검증합니다.

### 옵셔널 트랙 (PyTorch)

옵셔널 트랙에서 weight를 직접 학습하려면 Python과 PyTorch가 필요합니다. 자세한 설치와 실행은 `lessons/optional/O1-pytorch-setup/README.md`에 있습니다. 학습한 결과를 메인 트랙에 반영하는 흐름은 다음과 같습니다.

```bash
# 옵셔널 트랙에서 학습 후
python lessons/optional/O3-train-tiny-sr/train.py            # tiny SR 모델 학습
python lessons/optional/O3-train-tiny-sr/export-checkpoint.py  # model/tiny-sr.checkpoint 로 저장
bun run make:weights                                        # 내가 학습한 weight를 메인 레슨에 연결
```

이후 메인 트랙의 CNN SR 데모를 다시 열면 직접 학습한 모델로 동작합니다.

### 자주 막히는 지점

- 화면이 검은색이면 먼저 `docs/webgpu-debugging.md`의 체크리스트를 봅니다.
- `navigator.gpu`가 `undefined`이면 브라우저가 WebGPU를 지원하지 않거나 플래그가 꺼진 상태입니다.
- `.wgsl` import가 안 되면 `with { type: "text" }`를 붙였는지, 또는 `bunfig.toml`의 loader 설정을 확인합니다.

## 이미지 출처

문서에 사용한 외부 이미지의 출처와 라이선스는 `docs/assets/CREDITS.md`에 명시되어 있습니다.
