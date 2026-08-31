# 실습 21. requestVideoFrameCallback 통합

`src/main.ts`의 TODO를 채워, 비디오 처리를 `requestVideoFrameCallback`(rVFC)으로 프레임 단위로 돌리세요. 제공된 공통 유틸(`@core/*`, `@ui/*`)을 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 21     # 21장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+). 샘플 영상은 `/videos/sample.mp4`로 서빙됩니다.

## 과제

화면/초기화 부분은 이미 되어 있습니다. 다음 TODO를 순서대로 채우세요.

1. **setup에서 한 번만 만들기** (매 프레임 새 객체 금지)
   - `frameTex = createFrameTexture(device, WIDTH, HEIGHT)` ← 매 프레임 여기에 현재 프레임을 복사
   - `outputTex = createStorageTexture(device, WIDTH, HEIGHT)`
   - `pipeline = createComputePipeline(device, filterShader)`
   - bind group: `binding 0` = `frameTex.createView()`, `binding 1` = `outputTex.createView()`
   - `blitter = new Blitter(device, format)`, `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`

2. **`processCurrentFrame(mediaTime)` 완성**
   - `processing = true` → `measureGpuMs`로 `copyVideoFrameToTexture` + compute pass(dispatch `gx, gy`) + submit
   - `blitter.blit(context, outputTex)` → `processing = false`
   - `stats.set("GPU 시간", ...)`, 예산(`FRAME_BUDGET_MS`) 초과 여부 표시

3. **rVFC 루프 `loop(now, metadata)` 완성**
   - `processing`이면 `skipped++` 하고 스킵, 아니면 `processCurrentFrame(metadata.mediaTime)`
   - **끝에서 반드시 `video.requestVideoFrameCallback(loop)` 재등록**

4. **재생 / 일시정지**
   - `playBtn` → `video.play()`, `pauseBtn` → `video.pause()`

5. **seek**
   - `seek` `"input"` → `video.currentTime = (Number(seek.value)/1000) * video.duration`
   - `video` `"seeked"` → 일시정지 상태면 `processCurrentFrame`으로 한 프레임만 갱신

6. **루프 시작**
   - 메타데이터 로드 후 `video.requestVideoFrameCallback(loop)`로 시작하고 `video.play()` 시도

## 성공 기준

- 오른쪽 캔버스에 grayscale로 변환된 영상이 **부드럽게** 흐른다(왼쪽 `<video>`와 같은 프레임).
- "일시정지"를 누르면 화면이 멈추고 `FPS`가 0으로 수렴한다(콜백이 멈춤). "재생"으로 다시 흐른다.
- seek 슬라이더를 움직이면 해당 시각의 프레임으로 바로 갱신된다.
- stats에 `GPU 시간`/`mediaTime`/`스킵` 수가 실시간으로 표시된다.

## 더 해보기 (선택)

- **부하 실험**: compute pass를 한 콜백에서 여러 번 dispatch해 일부러 무겁게 만들고, `스킵` 수가 늘어나는지 관찰하세요. 예산 초과 시 영상이 어떻게 보이는지 확인합니다.
- **mediaTime 활용**: `metadata.mediaTime`을 캔버스 위에 오버레이로 그려, GPU 출력이 정확히 어느 영상 시각인지 표시해보세요.
- **rAF와 비교**: rVFC 대신 rAF 루프로 바꿔 같은 영상을 돌려보고, 30fps 영상에서 같은 프레임이 중복 처리되는지(`presentedFrames`가 안 늘어나는 콜백이 있는지) 비교하세요.
- **폴백 분기**: `"requestVideoFrameCallback" in HTMLVideoElement.prototype`로 미지원을 탐지해 rAF로 폴백하고, stats에 어떤 경로인지 표시하세요.
