# 실습 8. Bind Group과 Pipeline

`src/main.ts` 의 TODO 를 채워, 입력 텍스처를 그대로 출력 텍스처로 복사하는 compute pipeline 을 완성하세요. 계산은 단순한 복사(passthrough)이고, 이 실습의 목표는 **bind group / pipeline / dispatch 와이어링을 직접 손으로 적어보는 것**입니다. 제공된 공통 유틸(`@core/*`)을 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 8      # 8장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 의 1~2(이미지 생성·표시, WebGPU 초기화)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **텍스처 만들기**
   - 입력 텍스처: `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 출력 텍스처: `createStorageTexture(device, WIDTH, HEIGHT)`
   - 입력과 출력은 반드시 서로 다른 텍스처여야 합니다.

2. **compute pipeline**
   - `createComputePipeline(device, copyShader)` (내부적으로 `layout: "auto"`)

3. **bind group**
   - `layout`: `pipeline.getBindGroupLayout(0)`
   - `entries`: `binding 0` = 입력 텍스처 `.createView()`, `binding 1` = 출력 텍스처 `.createView()`
   - `copy.wgsl` 의 `@binding(0)`/`@binding(1)` 와 번호가 정확히 맞아야 합니다.

4. **compute pass + dispatch** (헬퍼로 감싸지 말고 직접 적어보세요)
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - `device.createCommandEncoder()` → `beginComputePass()` → `setPipeline(...)` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

5. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

## 성공 기준

- 오른쪽 캔버스가 왼쪽 입력 이미지와 **똑같이** 보인다(복사이므로 변화 없음).
- 오른쪽이 검은 화면이면 와이어링이 틀린 것입니다. README "완성되면 이런 화면"의 디버깅 순서를 따라가세요.

## 더 해보기 (선택)

- **번호를 일부러 어긋내 보기**: bind group `entries` 의 `binding` 0 과 1 을 서로 바꾸고 실행해, 어떤 검증 에러가 콘솔에 뜨는지 읽어보세요. WebGPU 가 왜 "장황한 명시성"을 요구하는지 체감할 수 있습니다.
- **passthrough 를 한 줄 변환으로**: `copy.wgsl` 의 `textureStore` 직전에 `color = vec4f(color.rgb * 0.5, color.a);` 한 줄을 넣어 출력이 어두워지는지 확인하세요. 셰이더만 바꿔도 pipeline/bind group 와이어링은 그대로라는 점을 확인합니다.
- **명시적 layout 으로 바꿔 보기(도전)**: `createComputePipeline` 대신, `createBindGroupLayout` + `createPipelineLayout` 으로 layout 을 직접 만들어 `device.createComputePipeline({ layout: pipelineLayout, ... })` 로 같은 결과를 내보세요. README "pipeline layout" 절을 참고하세요.
