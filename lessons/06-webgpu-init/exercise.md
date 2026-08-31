# 실습 6. WebGPU 초기화

`src/main.ts` 의 TODO 를 채워 **raw WebGPU API 로 GPU 를 직접 초기화**하세요. 이 챕터는 초기화가 주제이므로, 일부러 공통 헬퍼(`@core/webgpu.ts`)를 쓰지 **않고** 호출을 손으로 짭니다. (7장부터는 그 헬퍼를 import 해서 씁니다.)

## 준비

```bash
bun install        # 처음 한 번
bun run dev 6      # 6장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저로 엽니다(Chrome/Edge 113+, Safari 26+, Firefox 141+).

## 과제

`src/main.ts` 안의 TODO 를 순서대로 채우세요. 막히면 `solution/main.ts` 와 비교하세요.

1. **지원 여부 확인**
   - `if (!navigator.gpu) { throw new Error("...") }` — 없으면 친절한 메시지로 throw (아래 `main().catch` 가 화면에 표시).

2. **GPUAdapter**
   - `const adapter = await navigator.gpu.requestAdapter();`
   - `await` 를 잊지 말고, `adapter` 가 `null` 이면 throw.

3. **GPUDevice**
   - `const device = await adapter.requestDevice();`

4. **GPUQueue**
   - `const queue = device.queue;`

5. **device lost 핸들러 (선택이지만 권장)**
   - `device.lost.then((info) => { console.error(...); stats.set("device 상태", ...); });`

6. **GPUCanvasContext**
   - `id="gpu"` 캔버스를 가져와 `const context = canvas.getContext("webgpu");` (null 이면 throw)

7. **format + configure**
   - `const format = navigator.gpu.getPreferredCanvasFormat();`
   - `context.configure({ device, format, alphaMode: "opaque" });`

8. **adapter 정보 표시**
   - `stats.set("WebGPU", "준비 완료");`
   - `stats.set("canvas format", format);`
   - `adapter.limits` 에서 한두 개(예: `maxBufferSize`, `maxComputeWorkgroupSizeX`)를 표시
   - `adapter.features.has("timestamp-query")` 결과를 표시
   - `adapter.info.vendor` / `adapter.info.architecture` 로 어떤 GPU 를 잡았는지 표시
     (`adapter.info` 는 동기 프로퍼티입니다. 예전 API 인 `requestAdapterInfo()` 는 쓰지 않습니다)

## 성공 기준

- stats 패널에 `WebGPU: 준비 완료`, `canvas format`, 그리고 adapter limits/feature 값이 표시된다.
- 콘솔에 에러가 없다. (`navigator.gpu` 미지원 환경이라면 빨간 에러 메시지가 뜨는 게 정상)

## 더 해보기 (선택)

- `src/core/webgpu.ts` 를 열어 여러분이 짠 raw 코드와 `initWebGPU` / `configureCanvas` 를 비교해보세요. 어떤 줄이 어떤 함수의 어디에 들어가 있는지 짚어보세요.
- `adapter.limits` 를 콘솔에 통째로 출력(`console.log(adapter.limits)`)해 어떤 한계값들이 있는지 둘러보세요. 후속 챕터에서 `maxComputeWorkgroupSizeX` 같은 값을 다시 만나게 됩니다.
- `requestDevice({ requiredFeatures: ["timestamp-query"] })` 처럼 feature 를 요청하면 무슨 일이 생기는지(지원 안 하면 reject) 실험해보세요.
