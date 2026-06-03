# 실습 4. CPU로 먼저 만드는 이미지 처리

`src/main.ts` 의 TODO 를 채워 CPU 이미지 처리 5종을 완성하세요. WebGPU 는 필요 없습니다. 제공된 공통 유틸(`@core/*`, `@math/*`)과 공통 UI 를 사용합니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 04     # 4장 개발 서버 (http://localhost:5173)
```

> 이 챕터는 GPU 가 없어도 동작합니다. 2D canvas 만 씁니다.

## 과제

화면/입력 생성/이벤트 연결은 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **brightness 구현** (`@math` 에 없으므로 로컬로)
   - 각 색 채널 `c`(0~255)를 `/255` 로 0~1 float 로 바꾸고, `b` 를 더한 뒤 `Math.min(1, Math.max(0, c + b))` 로 clamp, 다시 `*255` 로 되돌립니다.
   - 정의: `out = clamp(c + b, 0, 1)`
   - 알파(인덱스 `i+3`)는 그대로 보존하세요.

2. **확대 도우미 채우기**
   - `extractChannel`: `plane[p] = rgba[p * 4 + ch]` 로 채널 하나를 float 평면으로 뽑기.
   - `upscaleRGBA`: R,G,B,A 네 채널을 `fn(extractChannel(...), WIDTH, HEIGHT, SCALE)` 로 각각 확대한 뒤, 다시 RGBA 로 인터리브해 합쳐 `{ data, width, height }` 로 반환.

3. **`apply()` 에서 필터 분기**
   - `"grayscale"` → `grayscale(srcPixels)`, `"invert"` → `invert(srcPixels)`, `"brightness"` → `brightness(srcPixels, 0.2)` 를 결과(256×256)로 그림.
   - `"nearest2x"` → `nearestUpscale`, `"bilinear2x"` → `bilinearUpscale` 를 `upscaleRGBA` 에 넘겨 확대. 결과 크기(512×512)에 맞게 `outCanvas.width/height` 를 먼저 갱신.
   - 그리기는 타입 안전하게 `createImageData` + `.data.set()` 패턴을 쓰세요:
     ```ts
     const img = outCtx.createImageData(w, h);
     img.data.set(out);              // out: Uint8ClampedArray
     outCtx.putImageData(img, 0, 0);
     ```
   - `outLabel.textContent` 와 `stats.set("필터" / "출력 크기" / "CPU 시간", ...)` 으로 상태를 표시.

## 성공 기준

- select 를 바꿀 때마다 오른쪽 결과가 즉시 갱신된다.
- grayscale 은 흑백, invert 는 색 반전, brightness 는 전체적으로 밝아진다.
- nearest 2x 는 경계가 계단(blocky)처럼, bilinear 2x 는 부드럽게 확대된다(출력 512×512).
- `nearestUpscale` / `bilinearUpscale` / `grayscale` / `invert` 를 직접 다시 구현하지 않고 `@math/*` 를 그대로 호출했다.

## 더 해보기 (선택)

- `b` 를 음수(`-0.2`)로도 적용해보고, clamp 덕분에 0 아래로 안 내려가는지 확인하세요. clamp 를 빼면 어떤 값이 나오는지 콘솔로 찍어보세요(`Uint8ClampedArray` 의 자동 clamp 와 헷갈리지 않게, 중간 float 값을 직접 출력).
- upscale 을 luma 한 채널만으로 해보고(채널별 처리 대신), 결과가 흑백이 되는 이유를 README 의 "단일 채널 평면" 설명과 엮어 생각해보세요.
- bilinear 의 가중치 4개를 `console.log` 로 찍어, 합이 항상 1 인지 확인하세요(가중 평균이라는 증거).
