# 실습 13. GPU Grayscale

`src/main.ts` 의 TODO 를 채워 GPU grayscale 을 완성하세요. 제공된 공통 유틸(`@core/*`, `@math/*`)을 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 13     # 13장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 안 1~2, 그리고 화면/초기화 부분은 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)`

2. **pipeline + bind group**
   - `createComputePipeline(device, grayscaleShader)`
   - bind group entries: `binding 0` = 입력 텍스처 `.createView()`, `binding 1` = 출력 텍스처 `.createView()`

3. **dispatch**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

4. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

5. **CPU 비교**
   - `const gpuPixels = await readTextureRGBA(device, outputTex, WIDTH, HEIGHT);`
   - 입력 픽셀을 `getImageData` 로 얻어 `grayscale(...)` 로 CPU 결과 계산
   - `maxAbsDiff(cpuGray, gpuPixels)` 를 `stats.set(...)` 로 표시

## 성공 기준

- 오른쪽 캔버스에 흑백 이미지가 나온다.
- stats 패널에 `CPU vs GPU 최대차` 가 `2 / 255` 이하로 나오고 `✅ 일치` 판정이 뜬다.

## 더 해보기 (선택)

- `shaders/` 에 `invert.wgsl` 을 만들어 색 반전 compute shader 를 추가하고, 버튼으로 grayscale/invert 를 전환해보세요. (`src/math/color.ts` 의 `invert` 와 비교)
- luma 가중치를 `(1/3, 1/3, 1/3)` 로 바꾸면 결과가 어떻게 달라지는지 관찰하고, 왜 Rec.709 가중치를 쓰는지 생각해보세요.
