# 실습 10. WGSL 주소 공간과 바인딩

`src/main.ts` 의 TODO 를 채워, 입력 텍스처 + uniform 버퍼로 tint(색조)를 적용하세요. 제공된 공통 유틸(`@core/*`)을 사용하고, 셰이더는 `shaders/tint.wgsl` 을 그대로 씁니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 10     # 10장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+).

## 과제

화면/초기화(1~2)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)`

2. **uniform 버퍼 만들기 (이 챕터의 핵심)**
   - WGSL `struct Params { tint: vec3f, strength: f32 }` 에 맞춰 `Float32Array` 를 채웁니다.
   - 슬롯 대응: `[0]=tint.r, [1]=tint.g, [2]=tint.b, [3]=strength`.
   - `[3]`(strength)이 **`vec3f` 의 16바이트 정렬 뒤 패딩 자리(12~16바이트)** 에 들어가므로 패딩 없이 4칸이면 됩니다. (왜 그런지는 README 의 정렬 표를 다시 보세요.)
   - `const paramsBuffer = createUniformBuffer(device, params);`

3. **pipeline + bind group**
   - `createComputePipeline(device, tintShader)`
   - entries 의 binding 번호가 WGSL `@binding` 과 정확히 맞아야 합니다:
     - `binding 0` = 입력 텍스처 `.createView()` (texture_2d)
     - `binding 1` = `{ buffer: paramsBuffer }` (var<uniform>)
     - `binding 2` = 출력 텍스처 `.createView()` (texture_storage_2d)

4. **dispatch**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

5. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

## 성공 기준

- 오른쪽 캔버스에 청록(cyan) 색조가 섞인 이미지가 나온다.
- 색이 **이상하게 깨지지 않는다.** 만약 색이 전부 망가져 보이면 uniform 레이아웃이 어긋난 것입니다 — `Float32Array` 슬롯과 `struct Params` 의 바이트 오프셋을 다시 맞춰보세요.

## 더 해보기 (선택)

- `strength` 값을 0, 0.25, 0.75, 1.0 으로 바꿔가며 결과를 관찰하세요. 0 이면 원본, 1 이면 단색에 가까워지는지 확인하세요.
- **정렬 함정 직접 체험:** `tint.wgsl` 의 struct 를 `struct Params { strength: f32, tint: vec3f }` 로 **순서만 바꿔** 보세요. 이제 `tint` 가 offset 16 에서 시작하므로 `Float32Array([strength, r, g, b])` 로 채우면 깨집니다. 올바르게 채우려면 어떤 인덱스에 패딩이 필요한지 계산해 고쳐보세요. (힌트: `[strength, _pad, _pad, _pad, r, g, b, _pad]`)
- `tint` 색을 바꿔(예: 주황 `[0.98, 0.55, 0.1]`) 색조가 어떻게 달라지는지 보세요.
