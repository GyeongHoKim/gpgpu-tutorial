# 실습 3. 픽셀 데이터 이해

`src/main.ts` 의 TODO 를 채워, 마우스가 가리킨 픽셀의 값을 stats 패널에 표시하세요. 제공된 공통 유틸(`@core/test-image.ts`, `@ui/*`)을 사용합니다. 이 챕터는 **WebGPU 가 필요 없습니다** — 순수 2D canvas 와 픽셀 산술만 다룹니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 03     # 3장 개발 서버 (http://localhost:5173)
```

WebGPU 가 없어도 동작하지만, 같은 브라우저(Chrome/Edge 최신)로 열면 됩니다.

## 과제

이미지 그리기·픽셀 배열 읽기·마우스 좌표 변환·확대 뷰는 이미 되어 있습니다. `mousemove` 핸들러 안의 TODO 4개를 순서대로 채우세요.

1. **pixel index 와 배열 offset**
   - `pixelIndex = y * WIDTH + x` (행 우선 저장: $y \cdot W + x$)
   - `i = pixelIndex * 4` (한 픽셀이 R,G,B,A 4칸)

2. **0~255 정수 RGBA**
   - `data[i]`, `data[i + 1]`, `data[i + 2]`, `data[i + 3]` 을 각각 `r, g, b, a` 에 담기

3. **0~1 float 색상**
   - 각 채널을 255 로 나누기: `rf = r / 255`, `gf`, `bf`, `af`

4. **UV 좌표**
   - `u = (x + 0.5) / WIDTH`, `v = (y + 0.5) / HEIGHT` (픽셀 중심을 정규화)

표시(`stats.set(...)`) 부분은 이미 작성돼 있으니, 값만 올바르게 계산하면 화면에 바로 반영됩니다.

## 성공 기준

- 이미지 위에서 마우스를 움직이면 `좌표 (x, y)`, `pixel index`, `RGBA 0~255`, `RGBA 0~1 float`, `UV (u, v)` 가 실시간으로 갱신된다.
- 왼쪽 위 모서리에서 $(x, y)$, $(u, v)$ 가 0 에 가깝고, 오른쪽 아래로 갈수록 1 에 가까워진다 (Y가 아래로 증가).
- 흰 원 영역에서 `RGBA 0~255` 가 `(255, 255, 255, 255)`, float 이 `(1.000, 1.000, 1.000, 1.000)` 근처로 나온다.

## 더 해보기 (선택)

- `solution/main.ts` 의 `paintSwatch` 처럼, 현재 픽셀 색을 stats 의 값 칸 배경으로 칠하는 `색` 행을 추가해보세요.
- UV → pixel 역변환 `x = floor(u * WIDTH)`, `y = floor(v * HEIGHT)` 를 한 줄 더 계산해, 원래 $(x, y)$ 와 일치하는지 확인해보세요. (`+0.5` 의 효과를 직접 관찰)
- 확대 뷰의 16×16 을 8×8 이나 32×32 로 바꿔보고, `image-rendering: pixelated` 를 끄면(보간 켜짐) texel 격자가 어떻게 뭉개지는지 비교해보세요.
