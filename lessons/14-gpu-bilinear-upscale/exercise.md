# 실습 14. GPU Bilinear Upscale

`src/main.ts` 의 TODO 를 채워 GPU 2x bilinear upscale 을 완성하세요. 제공된 공통 유틸(`@core/*`, `@math/*`)과 셰이더(`shaders/bilinear-upscale.wgsl`)를 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 14     # 14장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+).

## 과제

`src/main.ts` 에서 1~2(입력 생성·WebGPU 초기화)와 CPU 기준 함수(`extractChannel`, `upscaleRGBA`)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (크기에 주의)**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: IN_W, height: IN_H })` — 작게(128×128)
   - 출력 텍스처: `createStorageTexture(device, OUT_W, OUT_H)` — 2배 크게(256×256)

2. **pipeline + bind group**
   - `createComputePipeline(device, bilinearShader)`
   - bind group entries: `binding 0` = 입력 텍스처 `.createView()`, `binding 1` = 출력 텍스처 `.createView()`

3. **dispatch (출력 크기 기준!)**
   - `const [gx, gy] = dispatchSizeFor(OUT_W, OUT_H, [8, 8]);` ← 입력이 아니라 **출력** 크기
   - `measureGpuMs(device, () => { ... })` 로 감싸고, 그 안에서
     command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

4. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

5. **CPU 비교**
   - `const gpuPixels = await readTextureRGBA(device, outputTex, OUT_W, OUT_H);`
   - `const cpuPixels = upscaleRGBA(srcPixels);` (제공된 함수가 채널별 `bilinearUpscale` 후 RGBA 합성)
   - `maxAbsDiff(cpuPixels, gpuPixels)` 를 `stats.set("CPU vs GPU 최대차", ...)` 로 표시
   - 판정: `diff <= 3` 이면 `✅ 일치`

## 성공 기준

- 오른쪽 캔버스에 2배로 부드럽게 확대된 이미지가 나온다.
- stats 패널에 `CPU vs GPU 최대차` 가 `3 / 255` 이하로 나오고 `✅ 일치` 판정이 뜬다.

> 막히면 `solution/main.ts` 와 비교하세요. `최대차` 가 크게 나오면 GPU 가 아니라 **좌표 규약** 을 의심하세요(README 의 `> 주의:` 블록 참고). 셰이더의 역산 식이 `(x + 0.5) / SCALE - 0.5` 인지, clamp-to-edge 처리가 있는지 확인합니다.

## 더 해보기 (선택)

- index.html 의 `모드` 셀렉트를 nearest 로 바꿔 결과를 비교하세요. solution 은 `shaders/nearest-upscale.wgsl` 과 `nearestUpscale` CPU 기준을 함께 토글합니다. nearest 의 계단형 경계와 bilinear 의 부드러운 경계를 흰 원 가장자리에서 관찰해보세요.
- 셰이더의 `+0.5`/`-0.5` 보정을 일부러 빼 보세요. 화면은 비슷하지만 `최대차` 가 어떻게 커지는지(특히 가장자리) 확인하고, 왜 그런지 설명해보세요.
- `SCALE` 을 3 이나 4 로 바꿔(셰이더 상수 + 출력 텍스처 크기 + CPU `SCALE` 모두) 더 큰 확대를 시도해보세요.
