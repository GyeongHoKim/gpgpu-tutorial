// 실습: 아래 TODO 를 채워 CPU 이미지 처리 5종을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: makeTestImageCanvas 로 입력 생성 -> ImageData(RGBA) 읽기
//       -> select 로 고른 필터 적용 -> 결과 canvas 에 그리기
//
// grayscale / invert 는 @math/color.ts 를, nearest / bilinear 는
// @math/upscale.ts 를 재사용합니다 (직접 다시 구현하지 마세요).
// brightness 만 @math 에 없으므로 이 파일 안에 로컬로 구현합니다.
import { makeTestImageCanvas } from "@core/test-image.ts";
import { grayscale, invert } from "@math/color.ts";
import { nearestUpscale, bilinearUpscale, type Plane } from "@math/upscale.ts";

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;
const SCALE = 2;

// 1) TODO: brightness 를 구현하세요.
//    각 색 채널 c(0~255)를 0~1 float 로 바꾸고, b 를 더한 뒤 [0,1] 로 clamp,
//    다시 0~255 로 되돌립니다.  out = clamp(c + b, 0, 1)
//    알파(인덱스 i+3)는 그대로 보존하세요.
function brightness(rgba: Uint8ClampedArray, b: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  // ... 여기를 채우세요 ...
  void b;
  return out;
}

// 2) TODO (확대용 도우미): upscale 함수는 "단일 채널 평면" 기준입니다.
//    컬러 이미지를 확대하려면 R,G,B,A 네 채널을 각각 따로 확대한 뒤 RGBA 로 합칩니다.
//    extractChannel: RGBA 에서 채널 하나를 float 평면으로 뽑기.
function extractChannel(rgba: Uint8ClampedArray, ch: number, n: number): Float32Array {
  const plane = new Float32Array(n);
  // ... 여기를 채우세요 (plane[p] = rgba[p * 4 + ch]) ...
  void ch;
  return plane;
}

function upscaleRGBA(
  rgba: Uint8ClampedArray,
  fn: (p: ArrayLike<number>, w: number, h: number, s: number) => Plane,
): { data: Uint8ClampedArray; width: number; height: number } {
  // ... 채널 4개를 fn 으로 확대하고 다시 RGBA 로 합쳐 반환하세요 ...
  // 힌트: fn(extractChannel(rgba, ch, WIDTH*HEIGHT), WIDTH, HEIGHT, SCALE)
  void rgba; void fn; void SCALE;
  return { data: new Uint8ClampedArray(0), width: 0, height: 0 };
}

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const filterSel = document.getElementById("filter") as HTMLSelectElement;
  const outLabel = document.getElementById("out-label") as HTMLElement;

  // 입력 이미지 생성 + 표시 (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 입력 픽셀(RGBA 0~255)을 한 번만 읽어 둔다. (제공됨)
  const srcPixels = srcCanvas
    .getContext("2d")!
    .getImageData(0, 0, WIDTH, HEIGHT).data;

  const outCanvas = document.getElementById("out") as HTMLCanvasElement;
  const outCtx = outCanvas.getContext("2d")!;

  function apply() {
    const filter = filterSel.value;

    // 3) TODO: filter 값에 따라 결과를 만들고 outCanvas 에 그리세요.
    //    - "grayscale" / "invert" / "brightness": 256x256 결과를 그림.
    //        grayscale(srcPixels), invert(srcPixels), brightness(srcPixels, 0.2)
    //    - "nearest2x" / "bilinear2x": upscaleRGBA 로 확대 후 그림 (출력 크기 512x512).
    //        outCanvas.width/height 를 결과 크기에 맞춰 갱신해야 합니다.
    //    - 그리는 방법(타입 안전):
    //        const img = outCtx.createImageData(w, h);
    //        img.data.set(out);            // out: Uint8ClampedArray
    //        outCtx.putImageData(img, 0, 0);
    //    - outLabel.textContent 와 stats.set(...) 으로 필터/출력 크기/CPU 시간을 표시.
    void filter; void grayscale; void invert; void brightness;
    void nearestUpscale; void bilinearUpscale; void upscaleRGBA;
    void srcPixels; void outCtx; void outLabel; void stats;

    stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
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
