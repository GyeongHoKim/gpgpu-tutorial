# 실습 19. FSRCNN Super Resolution

`src/main.ts` 의 TODO 를 채워, 학습된 FSRCNN 추론을 완성하세요. conv·deconv 는 직접 짜지 않습니다 — 공통 추론 엔진(`@core/cnn.ts`)에 이미 생성된 weight(`model/fsrcnn-weights.ts`)를 올려 호출합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 19     # 19장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+).

## 핵심 차이 (18장과 반대)

- **SRCNN**: 먼저 bilinear 로 HR 확대 → conv 3장을 256 해상도에서.
- **FSRCNN**: LR(128) 텍스처를 **그대로** conv 5장에 → 마지막 deconv 로 256 확대.
- 그래서 conv 앞에 사전 확대가 **없습니다**. 사이즈가 커지는 건 **deconv 한 곳뿐**입니다.

## 과제

`src/main.ts` 에서 1~2(LR 입력 생성·WebGPU 초기화·두 출력 캔버스)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (크기에 주의)**
   - 입력: `createTextureFromSource(device, lrCanvas, { width: LR_W, height: LR_H })` — 작게(128×128)
   - bilinear baseline: `createStorageTexture(device, HR_W, HR_H)` — 256, **비교용**
   - FSRCNN 출력: `createStorageTexture(device, HR_W, HR_H)` — 256

2. **bilinear upscale (비교용 baseline)**
   - `createComputePipeline(device, bilinearShader)` + bind group (binding 0 = 입력 LR view, 1 = bilinear HR view)
   - `const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);` ← **출력(HR)** 크기 기준

3. **FSRCNN 셋업 (한 번만)**
   - `const runner = new CnnRunner(device);`
   - conv 5장: `fsrcnn.layers.slice(0, 5)` 각각을 `uploadConvLayer(device, layer, LR_W, LR_H)` 로 올려 `[extract, shrink, map1, map2, expand]` 를 얻습니다. (전부 **128** 해상도!)
   - deconv 1장:
     ```
     const deconv = uploadDeconvLayer(
       device, fsrcnn.layers[5], LR_W, LR_H,
       fsrcnn.deconv!.stride, fsrcnn.deconv!.padding, fsrcnn.deconv!.output_padding,
     );
     ```
   - feature buffer 7개: `createFeatureBuffer(device, W, H, ch)`
     `feat0=3@128, feat1=16@128, feat2=8@128, feat3=8@128, feat4=8@128, feat5=16@128, feat6=3@256` ← **feat6 만 256!**

4. **bilinear 실행 + 화면**
   - `measureGpuMs` 로 감싸 bilinear compute pass 를 제출하고 biTex 를 채웁니다.
   - `const blitter = new Blitter(device, bi.format);` → `blitter.blit(bi.context, biTex);`

5. **FSRCNN 추론 (한 encoder 에 묶기)**
   - `measureGpuMs(device, () => { ... })` 안에서 하나의 command encoder 로:
     ```
     runner.rgbToFeatures(encoder, lrTex, feat0, LR_W, LR_H);
     runner.runConv(encoder, extract, feat0, feat1);
     runner.runConv(encoder, shrink, feat1, feat2);
     runner.runConv(encoder, map1, feat2, feat3);
     runner.runConv(encoder, map2, feat3, feat4);
     runner.runConv(encoder, expand, feat4, feat5);
     runner.runDeconv(encoder, deconv, feat5, feat6);          // 128 -> 256
     runner.featuresToRgb(encoder, feat6, frOutTex, HR_W, HR_H, 3);
     device.queue.submit([encoder.finish()]);
     ```
   - 제출 후 `blitter.blit(fr.context, frOutTex);`

6. **숫자 비교 (원본 HR 대비)**
   - 원본 픽셀: `hrCanvas.getContext("2d").getImageData(0, 0, HR_W, HR_H).data`
   - `readTextureRGBA(device, biTex, HR_W, HR_H)` / `readTextureRGBA(device, frOutTex, HR_W, HR_H)`
   - `maxAbsDiff(...)` 로 bilinear / FSRCNN 각각의 차이를 구해 `stats.set(...)` 로 표시.

## 성공 기준

- 세 캔버스(입력 LR / bilinear / FSRCNN)가 나란히 나오고, FSRCNN 결과가 깨지지 않고(격자·잡음 없이) HR 이미지로 나옵니다.
- stats 패널에 bilinear / FSRCNN GPU 시간과 `FSRCNN vs 원본 HR 최대차` 가 표시됩니다.
- **주의(정직한 기대치)**: tiny FSRCNN 은 bilinear 대비 gain 이 항상 크지 않습니다. 매끄러운 영역은 bilinear 가 강하고, 텍스처·경계에서 FSRCNN 이 낫습니다. `판정` 이 갈려도 정상입니다 — 이 실습의 목표는 **conv 5장 + deconv 파이프라인을 정확히 굴리는 것**입니다.

> 막히면 `solution/main.ts` 와 비교하세요. 결과가 깨지면 **(1) conv 앞에 bilinear 사전 확대를 넣지 않았는지**(FSRCNN 은 LR 텍스처를 그대로 받습니다), **(2) conv 5장은 128, deconv 출력 feat6 와 featuresToRgb 만 256 인지**, **(3) feature buffer 채널 수(3→16→8→8→8→16→3)와 layer 순서**가 맞는지를 의심하세요.

## 더 해보기 (선택)

- `featuresToRgb` 의 `selChannel` 인자(>= 0)로 extract 의 16개 feature map 중 하나를 grayscale 로 출력해, 학습된 filter 가 강조하는 특징(경계·색 패턴)을 눈으로 보세요.
- bilinear 시간과 FSRCNN 시간을 비교해 보고, 18장 SRCNN(256 에서 conv 3장)과 19장 FSRCNN(128 에서 conv 5장 + deconv)의 추론 시간을 표로 정리해 "왜 FSRCNN 이 Fast 인가"를 해상도로 설명해보세요.
- README 의 checkerboard 설명을 떠올리며, deconv 의 stride/kernel 관계가 어떤 경우 격자 무늬를 만드는지, 우리 값(stride 2, kernel 9)이 왜 위험군인지 적어보세요.
