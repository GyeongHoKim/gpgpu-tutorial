/**
 * CPU 기준 업스케일. nearest 와 bilinear.
 * 단일 채널 평면 기준. SR 의 기본 확대(14장)를 CPU 로 먼저 이해하기 위함.
 */

export interface Plane {
  data: Float32Array;
  width: number;
  height: number;
}

function clampIndex(v: number, max: number): number {
  return v < 0 ? 0 : v >= max ? max - 1 : v;
}

/** scale 은 양의 정수만 허용한다 (출력 크기가 정수여야 함). */
function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`upscale: scale 은 1 이상의 정수여야 합니다 (받은 값: ${scale}).`);
  }
}

/** nearest-neighbor 업스케일: 가장 가까운 원본 픽셀을 그대로 복제. */
export function nearestUpscale(
  plane: ArrayLike<number>,
  width: number,
  height: number,
  scale: number,
): Plane {
  assertScale(scale);
  const ow = width * scale;
  const oh = height * scale;
  const out = new Float32Array(ow * oh);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      out[y * ow + x] = plane[sy * width + sx];
    }
  }
  return { data: out, width: ow, height: oh };
}

/**
 * bilinear 업스케일: 출력 픽셀 중심을 원본 좌표로 역산한 뒤,
 * 주변 4개 픽셀을 선형 보간한다.
 */
export function bilinearUpscale(
  plane: ArrayLike<number>,
  width: number,
  height: number,
  scale: number,
): Plane {
  assertScale(scale);
  const ow = width * scale;
  const oh = height * scale;
  const out = new Float32Array(ow * oh);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      // 출력 픽셀 중심 (x+0.5, y+0.5) 를 원본 좌표로 역산
      const srcX = (x + 0.5) / scale - 0.5;
      const srcY = (y + 0.5) / scale - 0.5;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const tx = srcX - x0; // 가로 보간 비율 0..1
      const ty = srcY - y0; // 세로 보간 비율 0..1

      const x0c = clampIndex(x0, width);
      const x1c = clampIndex(x0 + 1, width);
      const y0c = clampIndex(y0, height);
      const y1c = clampIndex(y0 + 1, height);

      const v00 = plane[y0c * width + x0c];
      const v10 = plane[y0c * width + x1c];
      const v01 = plane[y1c * width + x0c];
      const v11 = plane[y1c * width + x1c];

      const top = v00 * (1 - tx) + v10 * tx;
      const bot = v01 * (1 - tx) + v11 * tx;
      out[y * ow + x] = top * (1 - ty) + bot * ty;
    }
  }
  return { data: out, width: ow, height: oh };
}
