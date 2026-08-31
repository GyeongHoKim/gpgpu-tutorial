# 실습 22. 실시간 Super Resolution 데모 (캡스톤)

`src/main.ts` 의 TODO 를 채워, `<video>` 위에서 SRCNN/FSRCNN 을 실시간으로 돌리는 플레이어를 완성하세요. **새 알고리즘은 없습니다** — 18·19장의 SR 추론을 21장의 프레임 루프에 연결하는 것이 전부입니다. conv·deconv·확대·blit·프레임 복사는 직접 짜지 않고 `@core` 엔진을 호출합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 22     # 22장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+). 자동재생이 막히면 `재생` 버튼을 누르세요.

## 제1 규칙 (반드시)

> **매 프레임 새 객체 금지.** layer·feature buffer·pipeline·bind group·texture 는 전부 **setup 에서 한 번만** 만듭니다. 루프(`onFrame`) 안에서 새로 만드는 것은 **command encoder 하나뿐**입니다. 어기면 영상이 끊깁니다.

## 과제

`src/main.ts` 에서 1~2(WebGPU 초기화·두 출력 캔버스·비디오 src·첫 프레임 대기)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 (한 번만)** — `frameTex = createFrameTexture(device, LR_W, LR_H)`(320×240), `hrTex = createStorageTexture(device, HR_W, HR_H)`(640×480, bilinear 결과 = 왼쪽 + SRCNN 입력), `srOutTex = createStorageTexture(device, HR_W, HR_H)`(SR 출력 = 오른쪽).

2. **bilinear pipeline + bind group** — `createComputePipeline(device, bilinearShader)`, binding 0 = `frameTex` view, 1 = `hrTex` view. `const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8])`(출력 기준).

3. **SR 셋업 (SRCNN·FSRCNN 둘 다 미리)** — `const runner = new CnnRunner(device)`.
   - **SRCNN (전부 640×480)**: `srcnn.layers.map((l) => uploadConvLayer(device, l, HR_W, HR_H))` → `[sConv1,sConv2,sConv3]`. feature: `sFeat0=3@HR, sFeat1=16@HR, sFeat2=16@HR, sFeat3=3@HR`.
   - **FSRCNN (conv 5장 = 320×240, deconv 만 640×480)**: `fsrcnn.layers.slice(0,5).map((l) => uploadConvLayer(device, l, LR_W, LR_H))` → `[fExtract,fShrink,fMap1,fMap2,fExpand]`; `fDeconv = uploadDeconvLayer(device, fsrcnn.layers[5], LR_W, LR_H, fsrcnn.deconv!.stride, fsrcnn.deconv!.padding, fsrcnn.deconv!.output_padding)`. feature: `fFeat0=3@LR, fFeat1=16@LR, fFeat2=8@LR, fFeat3=8@LR, fFeat4=8@LR, fFeat5=16@LR, fFeat6=3@HR` ← **fFeat6 만 HR!**

4. **`const blitter = new Blitter(device, bi.format)`**.

5. **추론 기록 함수 3개** (각자 받은 `encoder` 에 pass 만 기록, submit 은 호출자가):
   - `recordBilinear(encoder)`: bilinear pass(`frameTex → hrTex`).
   - `recordSrcnn(encoder)`: `rgbToFeatures(encoder, hrTex, sFeat0, HR_W, HR_H)` → `runConv` ×3(sConv1→sConv2→sConv3) → `featuresToRgb(encoder, sFeat3, srOutTex, HR_W, HR_H, 3)`.
   - `recordFsrcnn(encoder)`: `rgbToFeatures(encoder, frameTex, fFeat0, LR_W, LR_H)` → `runConv` ×5 → `runDeconv(encoder, fDeconv, fFeat5, fFeat6)`(320→640) → `featuresToRgb(encoder, fFeat6, srOutTex, HR_W, HR_H, 3)`.

6. **컨트롤** — `let model = "srcnn"; let srOn = true; let paused = false;`.
   - `#model`(select) `change` → `model` 변경.
   - `#srToggle`(button) `click` → `srOn` 토글 + 라벨(`SR: ON`/`SR: OFF`)·`aria-pressed` 갱신.
   - `#playPause`(button) `click` → `paused` 토글, `video.pause()`/`video.play()`; **재생 재개 시 `video.requestVideoFrameCallback(onFrame)` 로 루프를 다시 걸기**.

7. **FPS / 스킵 상태** — `processing=false, skippedCount=0, lastFpsTime, framesSinceFps, fps`.

8. **`processCurrentFrame()`** (한 프레임 추론):
   ```ts
   processing = true;
   const gpuMs = await measureGpuMs(device, () => {
     const encoder = device.createCommandEncoder();
     copyVideoFrameToTexture(device, video, frameTex, LR_W, LR_H);
     recordBilinear(encoder);
     if (srOn) { model === "srcnn" ? recordSrcnn(encoder) : recordFsrcnn(encoder); }
     device.queue.submit([encoder.finish()]);
   });
   blitter.blit(bi.context, hrTex);
   blitter.blit(sr.context, srOn ? srOutTex : hrTex);   // SR off 면 오른쪽도 bilinear
   processing = false;
   stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms ...`);   // 예산 초과면 ⚠ 표시
   ```

9. **`onFrame()`** (rVFC 콜백 — 새 객체 금지!):
   ```ts
   if (processing) { skippedCount++; stats.set("스킵", ...); }   // 밀렸으면 이번 프레임 스킵
   else void processCurrentFrame();
   // FPS 갱신(0.5초마다)
   if (!paused) video.requestVideoFrameCallback(onFrame);        // ★ 매번 재등록
   ```

10. **첫 콜백**: `video.requestVideoFrameCallback(onFrame);`.

## 성공 기준

- 두 캔버스(bilinear / SR)에 영상이 **실시간으로** 흐르고, 오른쪽 SR 결과가 깨지지 않습니다.
- **모델 전환**(SRCNN↔FSRCNN), **SR on/off**, **재생/일시정지** 가 즉시 반영됩니다.
- stats 에 **모델 · FPS · GPU 시간 · 스킵** 이 갱신되고, FSRCNN 으로 바꾸면 보통 GPU 시간이 줄고 FPS 가 오릅니다.
- 영상이 끊긴다면 **루프 안에서 객체를 새로 만들고 있지 않은지** 부터 의심하세요.

> 막히면 `solution/main.ts` 와 비교하세요. 결과가 깨지면 **(1) SRCNN 은 hrTex(640)를, FSRCNN 은 frameTex(320)를 입력으로 받는지**, **(2) FSRCNN conv 5장은 320, fFeat6·deconv·featuresToRgb 만 640 인지**, **(3) feature buffer 채널 수와 layer 순서**, **(4) 매 프레임 새 객체를 만들고 있지 않은지** 를 확인하세요.

## 더 해보기 (선택)

- **분할 화면 한 캔버스**: 왼쪽 절반은 bilinear, 오른쪽 절반은 SR 을 한 캔버스에 그려 "경계선" 으로 화질 차이를 보이게 만들어 보세요(slider 로 경계 이동).
- **자동 모델 전환**: GPU 시간이 예산을 N프레임 연속 초과하면 SRCNN→FSRCNN 으로 자동 강등(graceful degradation)하도록 해보세요 — 23장에서 다룰 적응형 처리의 맛보기입니다.
- **스킵 임계 실험**: `FRAME_BUDGET_MS` 를 8ms/33ms 로 바꿔 가며 스킵 수와 체감 부드러움이 어떻게 달라지는지 관찰하고, 왜 그런지 적어보세요.
