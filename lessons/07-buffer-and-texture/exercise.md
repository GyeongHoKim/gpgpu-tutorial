# 실습 7. Buffer와 Texture

`src/main.ts` 의 TODO 를 채워 "이미지 -> GPU texture -> 화면" 왕복과 uniform 버퍼 생성을 완성하세요. 제공된 공통 유틸(`@core/*`)을 사용합니다.

이번 챕터의 목표는 Buffer/Texture 의 **생성**과 **usage 플래그**를 이해하는 것입니다. 셰이더에서 실제로 읽어 쓰는 것은 8·10·12장에서 합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 7      # 7장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## 과제

`src/main.ts` 의 1~2(이미지 생성/표시, WebGPU 초기화)는 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **입력 텍스처 만들기**
   - `createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })`
   - 그다음 `src/core/texture.ts` 를 열어, 이 래퍼가 내부에서 `device.createTexture` 를 **어떤 usage 플래그**로 호출하는지 직접 확인하세요 (`TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT`).

2. **uniform 버퍼 만들기**
   - `const params = new Float32Array([0.5]); // colorIntensity`
   - `const paramBuffer = createUniformBuffer(device, params);`
   - `src/core/buffer.ts` 에서 이 래퍼가 `UNIFORM | COPY_DST` 로 만들고 16바이트 정렬을 처리하는 걸 확인하세요. (이 버퍼를 셰이더에서 쓰는 건 10장)

3. **화면에 표시 (텍스처 왕복)**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, inputTex);`
   - `Blitter` 는 `inputTex` 를 sampled texture(`TEXTURE_BINDING`)로 읽어 화면을 덮습니다.

4. **stats 표시**
   - `stats.set("입력 texture", `${WIDTH}x${HEIGHT} rgba8unorm`)`
   - `stats.set("uniform buffer", `${paramBuffer.size} bytes`)` 등 크기·usage 를 표시

## 성공 기준

- 오른쪽 캔버스에 왼쪽과 **똑같은** 이미지가 나온다 (GPU texture 를 한 바퀴 돌아온 결과).
- stats 패널에 입력 텍스처의 크기·포맷·usage 와 uniform 버퍼의 크기·usage 가 보인다.
- 콘솔에 validation error 가 없다.

## 더 해보기 (선택)

- **usage 일부러 빼보기**: `createTextureFromSource` 대신 직접 `device.createTexture` 를 호출하되 `COPY_DST` 를 빼고 `copyExternalImageToTexture` 를 호출해보세요. 콘솔에 어떤 validation error 가 뜨는지 읽어보고, 다시 플래그를 더해 고치세요. (usage 가 "미리 선언하는 약속"임을 체감하는 게 목적입니다.)
- **storage texture 와 비교**: `src/core/texture.ts` 의 `createStorageTexture` 가 `createTextureFromSource` 와 usage(`STORAGE_BINDING` vs `TEXTURE_BINDING`)·용도(쓰기 vs 읽기)에서 어떻게 다른지 표로 정리해보세요. 실제로 storage texture 에 써넣는 compute shader 는 13장에서 만듭니다.
- **uniform 값 바꿔보기**: `colorIntensity` 를 `0.5` 가 아닌 다른 값으로 바꿔 `writeBuffer` 가 잘 동작하는지(에러 없음) 확인하세요. 이 값이 화면에 반영되려면 셰이더가 읽어야 하는데, 그건 10장의 과제입니다.
