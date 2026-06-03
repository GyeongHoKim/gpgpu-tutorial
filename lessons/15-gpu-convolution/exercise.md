# 실습 15. GPU Convolution Filter

`src/main.ts` 의 TODO 를 채워 GPU 3x3 convolution 을 완성하세요. 제공된 공통 유틸(`@core/*`, `@math/*`)과 셰이더(`shaders/convolution-3x3.wgsl`)를 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 15     # 15장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

화면/초기화·luma 평면 생성·셀렉트 연결은 이미 되어 있습니다. `apply()` 안과 그 주변의 TODO 를 순서대로 채우세요.

1. **텍스처 만들기 (루프 밖, 한 번만)**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)` — 입력과 **분리**해야 합니다.

2. **pipeline + blitter (루프 밖, 한 번만)**
   - `createComputePipeline(device, convolutionShader)`
   - `new Blitter(device, format)` — kernel 이 바뀌어도 재사용합니다.

3. **kernel 을 storage buffer 로 전달 (`apply` 안)**
   - `const kernelData = new Float32Array([...kernel, bias]);` (길이 10: K0..K8, bias)
   - `const kernelBuffer = createStorageBuffer(device, kernelData);`

4. **bind group**
   - `binding 0` = 입력 텍스처 `.createView()`
   - `binding 1` = 출력 텍스처 `.createView()`
   - `binding 2` = `{ buffer: kernelBuffer }`

5. **dispatch + 시간 측정**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - `measureGpuMs(device, () => { ... pass.dispatchWorkgroups(gx, gy) ... })`

6. **화면 출력**
   - `blitter.blit(context, outputTex);`

7. **CPU 비교**
   - `const cpuPlane = convolve3x3(luma, WIDTH, HEIGHT, kernel, bias);`
   - cpuPlane 을 0~255 로 `clamp`·`round` 해 `Uint8ClampedArray` RGBA 로 만들기 (R=G=B=v, A=255)
   - `const gpuPixels = await readTextureRGBA(device, outputTex, WIDTH, HEIGHT);`
   - `maxAbsDiff(cpuRGBA, gpuPixels)` 를 `stats.set(...)` 로 표시

## 성공 기준

- 오른쪽 캔버스에 선택한 kernel 의 convolution 결과(흑백)가 나온다.
- 셀렉트로 `blur / sharpen / edge` 를 바꾸면 결과가 즉시 갱신된다.
- stats 패널에 `CPU vs GPU 최대차` 가 `3 / 255` 이하로 나오고 `✅ 일치` 판정이 뜬다.
- `edge` 에서 평탄한 부분이 검게, 윤곽선만 밝게 남는다(음수 clamp 가 양쪽에서 같게 동작).

## 더 해보기 (선택)

- **bias 실험**: `apply` 의 `bias` 를 `0` 대신 `0.25`(또는 255 단위면 별도 스케일) 로 바꿔 edge 결과가 어떻게 밝아지는지 보세요. CNN 의 bias 가 하는 일과 같습니다.
- **emboss kernel 추가**: `[-2,-1,0, -1,1,1, 0,1,2]` 를 셀렉트에 더해보세요(CPU 기준이 필요하면 같은 값으로 직접 비교). 새 kernel 도 셰이더 수정 없이 그대로 도는지 확인하세요 — kernel 은 데이터일 뿐입니다.
- **read 횟수 세어 보기**: 5x5 kernel 이면 픽셀당 몇 번 read 인지 계산하고, 왜 큰 kernel 이 느려지는지 README 의 "texture read 횟수와 성능"과 연결해 설명해보세요.
