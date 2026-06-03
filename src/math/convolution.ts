/**
 * CPU 기준 3x3 convolution. 단일 채널 평면(plane) 기준의 단순 구현.
 * 경계는 clamp(가장자리 픽셀 복제)로 처리한다.
 *
 * convolution 은 "주변 3x3 픽셀 벡터와 kernel 벡터의 내적 + bias" 이다.
 * GPU convolution(15장)과 결과를 숫자로 비교하는 기준이 된다.
 */

export type Kernel3x3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export const KERNELS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0] as Kernel3x3,
  blur: [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9) as unknown as Kernel3x3,
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0] as Kernel3x3,
  edge: [-1, -1, -1, -1, 8, -1, -1, -1, -1] as Kernel3x3,
} as const;

function clampCoord(v: number, max: number): number {
  return v < 0 ? 0 : v >= max ? max - 1 : v;
}

/**
 * width×height 단일 채널 평면에 3x3 conv 를 적용한다.
 * 반환은 Float32Array (정규화/클램프는 호출자가 처리).
 */
export function convolve3x3(
  plane: ArrayLike<number>,
  width: number,
  height: number,
  kernel: Kernel3x3,
  bias = 0,
): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = bias;
      let k = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const sx = clampCoord(x + i, width);
          const sy = clampCoord(y + j, height);
          acc += plane[sy * width + sx] * kernel[k++];
        }
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}
