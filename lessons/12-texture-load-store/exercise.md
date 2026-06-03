# 실습 12. WGSL에서 Texture 읽고 쓰기

`src/main.ts` 의 TODO 를 채워, `textureLoad` 로 입력 텍스처를 읽고 R↔B 채널을 스왑해 `textureStore` 로 출력 텍스처에 쓰는 흐름을 완성하세요. 제공된 공통 유틸(`@core/*`, `@math/*`)을 사용합니다. 셰이더(`shaders/transform.wgsl`)는 이미 완성되어 있으니, 먼저 읽으며 `textureLoad`/`textureStore`/범위 체크/clamp 패턴을 확인하세요.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 12     # 12장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 안 1~2(이미지 생성·WebGPU 초기화)와 `swapRB` CPU 함수는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (입력 ≠ 출력)**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)`
   - 이 둘은 반드시 서로 다른 텍스처여야 합니다 (같은 텍스처 동시 read/write 금지).

2. **pipeline + bind group**
   - `createComputePipeline(device, transformShader)`
   - bind group entries: `binding 0` = 입력 텍스처 `.createView()`, `binding 1` = 출력 텍스처 `.createView()`

3. **dispatch**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

4. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

5. **CPU 비교**
   - `const gpuPixels = await readTextureRGBA(device, outputTex, WIDTH, HEIGHT);`
   - 입력 픽셀을 `getImageData` 로 얻어 `swapRB(...)` 로 CPU 결과 계산
   - `maxAbsDiff(cpuSwapped, gpuPixels)` 를 `stats.set(...)` 로 표시

## 성공 기준

- 오른쪽 캔버스에 R↔B 가 스왑된 이미지가 나온다 (파랑↔빨강이 뒤바뀌고 초록은 그대로).
- stats 패널에 `CPU vs GPU 최대차` 가 `2 / 255` 이하로 나오고 `✅ 일치` 판정이 뜬다.

## 더 해보기 (선택)

- `transform.wgsl` 의 변환을 **좌우 반전**으로 바꿔보세요: `textureStore` 좌표는 그대로 두되, 읽을 좌표를 `vec2i(i32(dims.x) - 1 - coord.x, coord.y)` 로 바꿔 읽습니다. CPU 쪽도 같은 식으로 바꿔 `maxAbsDiff` 로 검증해보세요. (읽기 좌표 계산에서 `clamp` 가 왜 안전망이 되는지 함께 생각해보세요.)
- 일부러 범위 체크 `if (gid.x >= dims.x ...) return;` 를 지우면 어떤 검증 오류/경고가 나는지 관찰하고, 왜 필요한지 다시 확인해보세요.
- 입력과 출력을 일부러 같은 텍스처로 바인딩해보고 어떤 에러가 나는지 확인해보세요 (입력=출력 동시 사용 금지의 이유 체감).
