import { test, expect } from "bun:test";
import { convolve3x3, KERNELS } from "../../src/math/convolution.ts";

test("identity kernel 은 입력을 그대로 둔다", () => {
  const plane = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const out = convolve3x3(plane, 3, 3, KERNELS.identity);
  for (let i = 0; i < plane.length; i++) expect(out[i]).toBeCloseTo(plane[i], 5);
});

test("blur kernel 의 합은 1 (평균 보존)", () => {
  const sum = KERNELS.blur.reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(1, 5);
});

test("균일한 평면은 blur 후에도 같은 값 (경계 clamp 포함)", () => {
  const w = 4, h = 4;
  const plane = new Array(w * h).fill(5);
  const out = convolve3x3(plane, w, h, KERNELS.blur);
  for (const v of out) expect(v).toBeCloseTo(5, 5);
});

test("bias 는 결과에 더해진다", () => {
  const plane = new Array(9).fill(0);
  const out = convolve3x3(plane, 3, 3, KERNELS.identity, 2);
  for (const v of out) expect(v).toBeCloseTo(2, 5);
});
