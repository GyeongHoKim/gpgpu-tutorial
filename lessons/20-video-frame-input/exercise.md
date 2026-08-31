# 실습 20. 정지 이미지에서 비디오 프레임으로

13장의 GPU grayscale 을 재생 중인 `<video>` 프레임으로 확장합니다. `src/main.ts` 의 TODO 를 채우세요. 공통 유틸(`@core/video-frame.ts` 등)을 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 20     # 20장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+). 샘플 영상은 dev 서버가 `/videos/sample.mp4` 로 서빙합니다.

## 과제

WebGPU 초기화·비디오 첫 프레임 대기·FPS 표시·토글 버튼은 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **setup — 루프 밖에서 한 번만 만들기** (TODO 3)
   - 입력 텍스처: `createFrameTexture(device, WIDTH, HEIGHT)`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)`
   - pipeline: `createComputePipeline(device, grayscaleShader)`
   - bind group: `binding 0` = 입력 텍스처 `.createView()`, `binding 1` = 출력 텍스처 `.createView()`
   - `const blitter = new Blitter(device, format);`
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - ⚠️ 이 객체들은 절대 `frame()` 안에서 만들지 마세요.

2. **루프 frame() — 매 프레임 내용만 갱신** (TODO 4)
   - (a) `copyVideoFrameToTexture(device, video, inputTex, WIDTH, HEIGHT)` 로 현재 프레임을 입력 텍스처에 복사 (만든 텍스처 재사용).
   - (b) `filterOn` 이면: command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, bindGroup)` → `dispatchWorkgroups(gx, gy)` → `end()` → `submit` 후 `blitter.blit(context, outputTex)`.
   - (b') `filterOn` 이 아니면: `blitter.blit(context, inputTex)` 로 원본을 그대로 그리기.
   - (d) 끝에 `requestAnimationFrame(frame)` 으로 다음 프레임 예약 (이게 루프).

## 성공 기준

- 오른쪽 canvas 에 영상이 **실시간 흑백**으로 재생된다.
- "필터" 버튼으로 grayscale ↔ 원본 컬러가 토글된다.
- stats 패널의 FPS 가 끊김 없이 유지된다. (객체를 매 프레임 새로 만들면 FPS 가 떨어지거나 끊긴다 — 직접 frame() 안에서 `createFrameTexture` 를 불러 비교해보면 차이를 체감할 수 있습니다.)

## 더 해보기 (선택)

- `frame()` 안에서 일부러 `createFrameTexture`/`new Blitter()` 를 매 프레임 만들어 보고, FPS 와 메모리 사용량이 어떻게 변하는지 관찰하세요. (관찰 후 반드시 원래대로 되돌리세요.)
- `shaders/` 에 `invert.wgsl`(색 반전)을 추가하고, 버튼으로 grayscale / invert / off 3단 토글로 바꿔보세요.
- `WIDTH`/`HEIGHT` 를 고정값 대신 `video.videoWidth`/`video.videoHeight` 에서 읽도록 바꿔, 다른 크기의 영상도 자동으로 처리되게 해보세요.
- 21장 예고: 이 rAF 루프를 `video.requestVideoFrameCallback` 으로 바꾸면 같은 프레임을 두 번 처리하는 낭비가 사라집니다. 직접 바꿔보고 무엇이 달라지는지 확인해보세요.
