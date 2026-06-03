// 4장 정답 코드. WebGPU 없이 2D canvas 만으로 이미지 처리 5종을 구현한다.
//
// 흐름: makeTestImageCanvas 로 입력 생성 -> ImageData(RGBA) 읽기
//       -> select 로 고른 필터 적용 -> 결과 canvas 에 그리기
//
// grayscale / invert 는 src/math/color.ts 를, nearest / bilinear 는
// src/math/upscale.ts 를 그대로 재사용한다 (중복 구현 금지).
// brightness 만 src/math 에 없으므로 이 파일 안에 로컬로 둔다.
import { makeTestImageCanvas } from "@core/test-image.ts";
import { grayscale, invert } from "@math/color.ts";
import { nearestUpscale, bilinearUpscale, type Plane } from "@math/upscale.ts";

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;
const SCALE = 2;

/**
 * brightness: 각 색 채널 c 에 b 를 더하고 [0,1] 로 clamp.
 *   out = clamp(c + b, 0, 1)
 * 입력/출력은 RGBA 0~255 정수. 내부에서 0~1 float 로 바꿔 계산한다.
 * (src/math 에는 아직 없어 lesson 로컬 함수로 둔다. color.ts 로 승격할 만하다.)
 */
function brightness(rgba: Uint8ClampedArray, b: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const c = rgba[i + ch] / 255; // 0~255 정수 -> 0~1 float
      const v = Math.min(1, Math.max(0, c + b)); // clamp(c + b, 0, 1)
      out[i + ch] = Math.round(v * 255); // 다시 0~255 정수
    }
    out[i + 3] = rgba[i + 3]; // 알파 보존
  }
  return out;
}

/** RGBA 이미지에서 채널 하나(0=R,1=G,2=B,3=A)를 float 평면으로 뽑는다. */
function extractChannel(rgba: Uint8ClampedArray, ch: number, n: number): Float32Array {
  const plane = new Float32Array(n);
  for (let p = 0; p < n; p++) plane[p] = rgba[p * 4 + ch];
  return plane;
}

/**
 * upscale 함수들은 "단일 채널 평면" 기준이다. 컬러 이미지를 확대하려면
 * R,G,B,A 네 채널을 각각 따로 확대한 뒤 다시 RGBA 로 합친다.
 */
function upscaleRGBA(
  rgba: Uint8ClampedArray,
  fn: (p: ArrayLike<number>, w: number, h: number, s: number) => Plane,
): { data: Uint8ClampedArray; width: number; height: number } {
  const n = WIDTH * HEIGHT;
  const planes: Plane[] = [];
  for (let ch = 0; ch < 4; ch++) {
    planes.push(fn(extractChannel(rgba, ch, n), WIDTH, HEIGHT, SCALE));
  }
  const ow = planes[0].width;
  const oh = planes[0].height;
  const out = new Uint8ClampedArray(ow * oh * 4);
  for (let p = 0; p < ow * oh; p++) {
    out[p * 4 + 0] = planes[0].data[p];
    out[p * 4 + 1] = planes[1].data[p];
    out[p * 4 + 2] = planes[2].data[p];
    out[p * 4 + 3] = planes[3].data[p];
  }
  return { data: out, width: ow, height: oh };
}

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const filterSel = document.getElementById("filter") as HTMLSelectElement;
  const outLabel = document.getElementById("out-label") as HTMLElement;

  // 1) 입력 이미지를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  const srcDisplay = document.getElementById("src") as HTMLCanvasElement;
  srcDisplay.getContext("2d")!.drawImage(srcCanvas, 0, 0);

  // 입력 픽셀(RGBA 0~255)을 한 번만 읽어 둔다.
  const srcPixels = srcCanvas
    .getContext("2d")!
    .getImageData(0, 0, WIDTH, HEIGHT).data;

  const outCanvas = document.getElementById("out") as HTMLCanvasElement;
  const outCtx = outCanvas.getContext("2d")!;

  function apply() {
    const filter = filterSel.value;
    const t0 = performance.now();

    if (filter === "grayscale" || filter === "invert" || filter === "brightness") {
      // 크기가 그대로인 필터: 256x256 결과를 그대로 그린다.
      const out =
        filter === "grayscale"
          ? grayscale(srcPixels)
          : filter === "invert"
            ? invert(srcPixels)
            : brightness(srcPixels, 0.2);
      const ms = performance.now() - t0;

      outCanvas.width = WIDTH;
      outCanvas.height = HEIGHT;
      const img = outCtx.createImageData(WIDTH, HEIGHT);
      img.data.set(out);
      outCtx.putImageData(img, 0, 0);

      outLabel.textContent = `결과 (${filter})`;
      stats.set("필터", filter);
      stats.set("출력 크기", `${WIDTH} x ${HEIGHT}`);
      stats.set("CPU 시간", `${ms.toFixed(2)} ms`);
    } else {
      // 확대 필터: 채널별로 확대 후 합쳐서 그린다.
      const fn = filter === "nearest2x" ? nearestUpscale : bilinearUpscale;
      const up = upscaleRGBA(srcPixels, fn);
      const ms = performance.now() - t0;

      outCanvas.width = up.width;
      outCanvas.height = up.height;
      const img = outCtx.createImageData(up.width, up.height);
      img.data.set(up.data);
      outCtx.putImageData(img, 0, 0);

      outLabel.textContent = `결과 (${filter})`;
      stats.set("필터", filter);
      stats.set("출력 크기", `${up.width} x ${up.height}`);
      stats.set("CPU 시간", `${ms.toFixed(2)} ms`);
    }
  }

  filterSel.addEventListener("change", apply);
  apply(); // 첫 렌더
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
