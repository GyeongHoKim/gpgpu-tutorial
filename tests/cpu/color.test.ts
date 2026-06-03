import { test, expect } from "bun:test";
import { grayscale, invert, lumaOf, LUMA, maxAbsDiff } from "../../src/math/color.ts";

test("luma 가중치 합은 1", () => {
  expect(LUMA.r + LUMA.g + LUMA.b).toBeCloseTo(1, 5);
});

test("흰색(255,255,255)의 luma 는 255", () => {
  expect(lumaOf(255, 255, 255)).toBeCloseTo(255, 5);
});

test("grayscale 결과는 R=G=B 이고 알파는 보존", () => {
  const px = new Uint8ClampedArray([100, 150, 200, 255]);
  const g = grayscale(px);
  expect(g[0]).toBe(g[1]);
  expect(g[1]).toBe(g[2]);
  expect(g[3]).toBe(255);
});

test("invert 는 255 - v, 알파는 보존", () => {
  const px = new Uint8ClampedArray([0, 100, 255, 255]);
  const g = invert(px);
  expect(g[0]).toBe(255);
  expect(g[1]).toBe(155);
  expect(g[2]).toBe(0);
  expect(g[3]).toBe(255);
});

test("maxAbsDiff 는 최대 절대 차이", () => {
  const a = new Uint8Array([0, 10, 20]);
  const b = new Uint8Array([0, 12, 17]);
  expect(maxAbsDiff(a, b)).toBe(3);
});
