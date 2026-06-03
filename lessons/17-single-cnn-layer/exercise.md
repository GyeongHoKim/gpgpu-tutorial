# 실습 17. 최소 CNN Layer 1개

`src/main.ts` 의 TODO 를 채워, RGB 입력에 conv layer 한 장(3채널 → feature map 16장, ReLU)을 GPU 로 돌리고, 선택한 feature map 한 장을 화면에 그리세요. 셰이더는 직접 짜지 않고 **CNN 엔진(`@core/cnn.ts`)** 을 가져다 씁니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 17     # 17장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 의 1~2(입력 이미지·WebGPU 초기화), 6(select 채널 목록), 8~9(이벤트 연결)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (TODO 3)**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)` — 선택 feature map 을 grayscale 로 그릴 곳.

2. **feature buffer 2장 만들기 (TODO 4)**
   - 입력 3채널: `createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.inC)`
   - conv 결과 16채널: `createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.outC)`
   - **왜 텍스처가 아니라 buffer?** `rgba8` 텍스처는 채널이 4개뿐이라 16채널이 안 들어갑니다.

3. **엔진 + conv layer 올리기 (TODO 5)**
   - `const runner = new CnnRunner(device);`
   - `const conv = uploadConvLayer(device, exampleConvLayer, WIDTH, HEIGHT);` — weight·bias 를 한 번만 GPU 에 올립니다.

4. **render() 완성 (TODO 7)** — 한 command encoder 안에서 순서대로:
   - `runner.rgbToFeatures(encoder, inputTex, inFeat, WIDTH, HEIGHT)` (텍스처 → 3채널 buffer)
   - `runner.runConv(encoder, conv, inFeat, outFeat)` (3채널 → 16채널, `o = ReLU(Wp+b)`)
   - `runner.featuresToRgb(encoder, outFeat, outputTex, WIDTH, HEIGHT, conv.outC, selChannel)` (16채널 중 선택 채널 → grayscale 텍스처)
   - 그다음 `device.queue.submit([encoder.finish()])` → `blitter.blit(context, outputTex)`
   - `measureGpuMs(device, () => { ... })` 로 감싸 GPU 시간을 재고 `stats.set(...)` 로 표시.

막히면 `solution/main.ts` 와 비교하세요.

## 성공 기준

- 오른쪽 캔버스에 선택 채널의 feature map(grayscale)이 나온다.
- 위쪽 `feature 채널` select 를 0 → 1 → 2 … 로 바꾸면 오른쪽 그림이 **채널마다 다르게** 바뀐다. (R/G/B 강조, edge, blur 등)
- stats 패널에 선택 채널 번호와 GPU 시간, 입력 3채널 / 출력 16채널이 표시된다.

## 더 해보기 (선택)

- `model/weights.ts` 의 filter 중 하나를 직접 다른 kernel 로 바꿔 보고(예: 채널 6의 가로 edge 를 더 강한 값으로), 그 채널 feature map 이 어떻게 달라지는지 관찰하세요.
- 색 대비 filter(채널 12: R−G)를 보세요. 입력에서 R 이 G 보다 큰 영역만 밝게 나옵니다 — ReLU 가 음수(R<G)를 0 으로 잘랐기 때문입니다. **ReLU 를 끄면**(`exampleConvLayer.activation` 을 `"none"` 으로) 무엇이 달라질지 예상한 뒤 바꿔서 확인해보세요.
- 16채널을 모두 한 화면에 4×4 타일로 그려 보면 어떨까요? (`featuresToRgb` 를 채널마다 작은 출력 텍스처에 그려 배치) — 16장 그림과 똑같은 모습이 됩니다.
