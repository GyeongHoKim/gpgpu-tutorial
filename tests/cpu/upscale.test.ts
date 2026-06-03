import { test, expect } from "bun:test";
import { nearestUpscale, bilinearUpscale } from "../../src/math/upscale.ts";

test("nearest 2x 는 크기를 2배로 만든다", () => {
  const r = nearestUpscale([1, 2, 3, 4], 2, 2, 2);
  expect(r.width).toBe(4);
  expect(r.height).toBe(4);
});

test("nearest 2x 는 원본 좌상단 값을 복제한다", () => {
  const r = nearestUpscale([1, 2, 3, 4], 2, 2, 2);
  // 원본 (0,0)=1 이 출력 (0,0),(1,0),(0,1),(1,1) 로 복제됨
  expect(r.data[0]).toBe(1);
  expect(r.data[1]).toBe(1);
  expect(r.data[r.width + 0]).toBe(1);
  expect(r.data[r.width + 1]).toBe(1);
});

test("bilinear 는 균일 평면을 같은 값으로 유지한다", () => {
  const r = bilinearUpscale([7, 7, 7, 7], 2, 2, 2);
  for (const v of r.data) expect(v).toBeCloseTo(7, 5);
});

test("bilinear 는 두 값 사이에서 중간값을 만든다", () => {
  // 1차원으로 보면 [0, 10] 사이를 2배 확대하면 중간 어딘가에 0~10 범위 값이 생긴다.
  const r = bilinearUpscale([0, 10, 0, 10], 2, 2, 2);
  let min = Infinity, max = -Infinity;
  for (const v of r.data) { min = Math.min(min, v); max = Math.max(max, v); }
  expect(min).toBeGreaterThanOrEqual(0);
  expect(max).toBeLessThanOrEqual(10);
  expect(max).toBeGreaterThan(min); // 보간으로 값이 퍼졌는지
});
