# 실습 11. Compute Shader 기초

`src/main.ts` 의 TODO 를 채워, 입력 없이 좌표(`global_invocation_id`)만으로 패턴을 그리는 compute shader 를 완성하세요. 제공된 공통 유틸(`@core/*`)을 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 11     # 11장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 의 1) WebGPU 초기화는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **출력 텍스처 만들기** (입력 텍스처는 없습니다)
   - `const outputTex = createStorageTexture(device, WIDTH, HEIGHT);`

2. **dims uniform 버퍼** (셰이더가 범위 체크에 쓸 이미지 크기)
   - `device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })`
   - `device.queue.writeBuffer(buf, 0, new Uint32Array([WIDTH, HEIGHT]))`

3. **pipeline + bind group**
   - `createComputePipeline(device, patternShader)`
   - bind group entries: `binding 0` = `{ buffer: dimsBuffer }`, `binding 1` = `outputTex.createView()`

4. **dispatch**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, WG);`  (`WG` 는 `[8, 8]` — 셰이더의 `@workgroup_size` 와 같아야 함)
   - command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

5. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

6. **(선택) 개수 표시**
   - `gx * gy` (workgroup 수), `gx * gy * 8 * 8` (총 invocation 수)를 `stats.set(...)` 으로 표시해 256×256 픽셀 수와 같은지 확인하세요.

## 성공 기준

- 오른쪽 캔버스에 UV 그라데이션 + 체커보드 패턴이 나온다.
- stats 패널의 `dispatch (workgroup)` 가 `32 × 32 = 1024`, `총 invocation` 이 `65536` 으로 나온다.

## 더 해보기 (선택)

- `pattern.wgsl` 에서 패턴을 **동심원**으로 바꿔보세요. 중심에서의 거리로 색을 정합니다.
  - 힌트: `let center = vec2f(dims.size) * 0.5; let d = distance(vec2f(gid.xy), center);` 그리고 `let ring = (sin(d * 0.2) + 1.0) * 0.5;` 같은 식으로 `vec3f(ring)` 을 칠합니다.
- `@workgroup_size(8, 8)` 을 `@workgroup_size(16, 16)` 으로 바꾸면, `dispatchSizeFor` 에 넘기는 `WG` 도 `[16, 16]` 으로 같이 바꿔야 합니다. 한쪽만 바꾸면 어떻게 깨지는지 관찰하고, 왜 그런지 설명해보세요.
- 일부러 범위 체크(`if ... return`)를 지우고 `WIDTH`/`HEIGHT` 를 `250` 처럼 8로 나누어떨어지지 않는 값으로 바꿔, 무슨 일이 생기는지 확인해보세요. (그 뒤 다시 복구하세요.)
