/**
 * CPU 기준 색상 연산. GPU 결과와 숫자로 비교(max abs diff)하는 기준이 된다.
 * 픽셀은 RGBA, 0~255 정수(Uint8ClampedArray) 기준.
 *
 * 중요: 여기 가중치는 GPU 셰이더(grayscale.wgsl)와 반드시 동일해야 한다.
 * 둘이 다르면 CPU vs GPU 비교가 의미를 잃는다.
 */

/** Rec.709 luma 가중치. R,G,B 가 밝기에 기여하는 비율. 합은 1. */
export const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;

/** RGB(0~255) 한 픽셀의 luma(밝기, 0~255). RGB 와 가중치 벡터의 내적. */
export function lumaOf(r: number, g: number, b: number): number {
  return LUMA.r * r + LUMA.g * g + LUMA.b * b;
}

/** RGBA 이미지를 grayscale 로. 새 Uint8ClampedArray 반환 (알파는 보존). */
export function grayscale(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const y = lumaOf(rgba[i], rgba[i + 1], rgba[i + 2]);
    out[i] = out[i + 1] = out[i + 2] = y;
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/** RGBA 이미지를 색 반전. 알파는 보존. */
export function invert(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = 255 - rgba[i];
    out[i + 1] = 255 - rgba[i + 1];
    out[i + 2] = 255 - rgba[i + 2];
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/**
 * 두 버퍼의 최대 절대 차이. CPU vs GPU 검증용.
 * 길이가 다르면 잘린 readback 등을 작은 차이로 잘못 통과시킬 수 있으므로 던진다.
 */
export function maxAbsDiff(
  a: Uint8Array | Uint8ClampedArray,
  b: Uint8Array | Uint8ClampedArray,
): number {
  if (a.length !== b.length) {
    throw new Error(`maxAbsDiff: 길이가 다릅니다 (${a.length} vs ${b.length}).`);
  }
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > m) m = d;
  }
  return m;
}
