# 실습 5. CPU Convolution

`src/main.ts` 의 TODO 를 채워 CPU convolution 데모를 완성하세요. 제공된 공통 유틸(`@core/*`, `@math/*`, `@ui/*`)을 사용합니다. **WebGPU 는 쓰지 않습니다** — 순수 2D canvas 입니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 05     # 5장 개발 서버 (http://localhost:5173)
```

WebGPU 가 필요 없으므로 브라우저는 아무거나 최신이면 됩니다.

## 과제

`src/main.ts` 의 1번(입력 이미지 생성/표시)과 셀렉트 연결(4번)은 이미 되어 있습니다. 다음 TODO 를 순서대로 채우세요.

1. **luma 평면 만들기 (2번 TODO)**
   - `rgba` 는 이미 `getImageData(...).data` 로 얻어 둔 RGBA 배열입니다.
   - `lumaOf(r, g, b)`(`@math/color.ts`)로 픽셀마다 밝기를 구해, 길이 `WIDTH*HEIGHT` 인 `luma`(`Float32Array`)를 채우세요.
   - 힌트: `for (let i = 0, p = 0; i < rgba.length; i += 4, p++) { luma[p] = lumaOf(rgba[i], rgba[i+1], rgba[i+2]); }`

2. **convolution 적용 (3번 TODO, `apply` 안)**
   - `convolve3x3(luma, WIDTH, HEIGHT, kernel)`(`@math/convolution.ts`)로 결과 평면을 계산하세요. 이미 호출 줄이 들어 있습니다.
   - **핵심**: 이 한 줄이 "각 출력 픽셀 = 주변 3x3 luma 벡터와 kernel 벡터의 내적" 입니다. 직접 구현하지 말고 재사용하세요.

3. **결과를 0~255 로 clamp 해 그리기 (3번 TODO 이어서)**
   - `out`(`createImageData`)의 각 픽셀 RGB 에 clamp 한 값을 넣고 알파는 255 로 두세요.
   - 힌트: `const v = Math.max(0, Math.min(255, Math.round(result[p])));`
   - sharpen / edge 는 음수가 흔합니다. clamp 를 빼면 색이 뒤집혀 보입니다.

4. (정리) `void luma;` 줄은 구현을 마치면 지우세요.

## 성공 기준

- 오른쪽 캔버스에 흑백 convolution 결과가 나온다.
- 셀렉트를 `blur / sharpen / edge / identity` 로 바꾸면 결과가 즉시 달라진다.
  - blur → 경계가 번지고, sharpen → 또렷해지고, edge → 윤곽선만 밝게 남고, identity → 원본 밝기 그대로.
- stats 패널에 선택한 `kernel` 이름과 `CPU 시간` 이 표시된다.

## 더 해보기 (선택)

- **나만의 kernel**: `convolve3x3` 에 직접 만든 `Kernel3x3`(길이 9 배열)을 넘겨보세요. 예) 가로 방향 미분 `[-1,0,1,-2,0,2,-1,0,1]`(Sobel X)을 적용하면 세로 윤곽이 강조됩니다. 가중치 합이 0 이면 왜 평탄한 영역이 검게 되는지 확인해보세요.
- **채널별 처리**: luma 한 평면 대신 R, G, B 세 평면에 각각 `convolve3x3` 를 적용하고 다시 합쳐 **컬러 결과**를 만들어보세요. (각 채널이 독립적인 한 평면이라는 점만 알면 됩니다.)
- **bias 주기**: `convolve3x3(luma, W, H, kernel, b)` 의 마지막 인자로 bias 를 줘보세요. edge kernel 에 `+128` 을 더하면 변화가 없는 곳이 회색(128)이 되어 음/양 경계가 둘 다 보입니다. — 이 `b` 가 CNN 에서 학습되는 bias 입니다.
