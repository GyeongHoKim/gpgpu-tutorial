# 실습 18. SRCNN Super Resolution

`src/main.ts` 의 TODO 를 채워, 학습된 SRCNN 추론을 완성하세요. conv 는 직접 짜지 않습니다 — 공통 추론 엔진(`@core/cnn.ts`)에 이미 생성된 weight(`model/srcnn-weights.ts`)를 올려 호출합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 18     # 18장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 에서 1~2(LR 입력 생성·WebGPU 초기화·두 출력 캔버스)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (크기에 주의)**
   - 입력: `createTextureFromSource(device, lrCanvas, { width: LR_W, height: LR_H })` — 작게(128×128)
   - HR(확대 결과): `createStorageTexture(device, HR_W, HR_H)` — 256×256. bilinear 가 **쓰고**, 이어서 conv 가 **읽는** 텍스처입니다.
   - SRCNN 출력: `createStorageTexture(device, HR_W, HR_H)`

2. **bilinear upscale (14장 재사용)**
   - `createComputePipeline(device, bilinearShader)` + bind group (binding 0 = 입력 view, 1 = HR view)
   - `const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);` ← **출력(HR)** 크기 기준

3. **SRCNN 셋업 (한 번만)**
   - `const runner = new CnnRunner(device);`
   - `srcnn.layers` 각각을 `uploadConvLayer(device, layer, HR_W, HR_H)` 로 올려 `[conv1, conv2, conv3]` 를 얻습니다.
   - feature buffer 4개: `createFeatureBuffer(device, HR_W, HR_H, ch)` — `feat0=3, feat1=16, feat2=16, feat3=3`

4. **bilinear 실행 + 화면**
   - `measureGpuMs` 로 감싸 bilinear compute pass 를 제출하고 HR 텍스처를 채웁니다.
   - `const blitter = new Blitter(device, bi.format);` → `blitter.blit(bi.context, hrTex);`

5. **SRCNN 추론 (한 encoder 에 묶기)**
   - `measureGpuMs(device, () => { ... })` 안에서 하나의 command encoder 로:
     ```
     runner.rgbToFeatures(encoder, hrTex, feat0, HR_W, HR_H);
     runner.runConv(encoder, conv1, feat0, feat1);
     runner.runConv(encoder, conv2, feat1, feat2);
     runner.runConv(encoder, conv3, feat2, feat3);
     runner.featuresToRgb(encoder, feat3, srOutTex, HR_W, HR_H, 3);
     device.queue.submit([encoder.finish()]);
     ```
   - 제출 후 `blitter.blit(sr.context, srOutTex);`

6. **숫자 비교 (원본 HR 대비)**
   - 원본 픽셀: `hrCanvas.getContext("2d").getImageData(0, 0, HR_W, HR_H).data`
   - `readTextureRGBA(device, hrTex, HR_W, HR_H)` / `readTextureRGBA(device, srOutTex, HR_W, HR_H)`
   - `maxAbsDiff(...)` 로 bilinear / SRCNN 각각의 차이를 구해 `stats.set(...)` 로 표시. SRCNN 의 차이가 더 작으면 디테일을 더 복원한 것입니다.

## 성공 기준

- 세 캔버스(입력 LR / bilinear / SRCNN)가 나란히 나오고, 오른쪽 SRCNN 결과가 가운데 bilinear 보다 **선명**합니다(흰 원 가장자리·가는 선에서 확인).
- stats 패널에 bilinear / SRCNN GPU 시간과 `SRCNN vs 원본 HR 최대차` 가 표시되고, `SRCNN vs 원본` 이 `bilinear vs 원본` **이하**로 나옵니다.

> 막히면 `solution/main.ts` 와 비교하세요. 결과가 깨지면 **(1) bilinear 확대를 conv 앞에 넣었는지**(SRCNN 은 흐릿한 HR 입력으로 학습됨), **(2) feature buffer 채널 수(3→16→16→3)** 와 **layer 순서(conv1→conv2→conv3)** 가 맞는지, **(3) `uploadConvLayer` 와 dispatch 가 모두 256×256 인지** 를 의심하세요.

## 더 해보기 (선택)

- `featuresToRgb` 의 `selChannel` 인자(>= 0)를 써서 conv1 의 16개 feature map 중 하나를 grayscale 로 출력해 보세요. 학습된 filter 들이 어떤 특징(경계·색 패턴)을 강조하는지 눈으로 볼 수 있습니다.
- conv2(1×1)를 일부러 건너뛰고 conv1 결과를 바로 conv3 에 넣어 보세요(채널 수가 안 맞아 에러가 납니다 — 왜인지 채널 수로 설명해보세요).
- bilinear 확대만 한 결과와 SRCNN 결과의 `원본 HR 대비 최대차`를 여러 테스트 이미지에서 비교해, 어떤 종류의 디테일(가는 선/경계)에서 SRCNN 이 특히 유리한지 관찰해보세요.
