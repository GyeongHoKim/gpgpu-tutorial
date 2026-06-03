// 3장 정답 코드. 픽셀 데이터를 직접 들여다보는 인터랙티브 데모.
//
// 흐름: 테스트 이미지를 캔버스에 그린다 -> getImageData 로 픽셀 배열을 얻는다
//       -> 마우스가 올라간 픽셀의 (x, y), RGBA(0~255), 0~1 float, UV 를 계산해 표시한다.
//
// 이 챕터는 GPU 가 필요 없다. "픽셀이 메모리에서 어떻게 생겼는가"만 확실히 잡는다.
import { makeTestImageCanvas } from "@core/test-image.ts";

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;
const ZOOM_RADIUS = 8; // 가리킨 픽셀 주변 ±8 (= 16×16) 을 확대해 보여준다.

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) 테스트 이미지를 코드로 생성하고 표시 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  const imgCanvas = document.getElementById("img") as HTMLCanvasElement;
  const imgCtx = imgCanvas.getContext("2d")!;
  imgCtx.drawImage(srcCanvas, 0, 0);

  // 2) 픽셀 데이터를 한 번만 읽어 둔다.
  //    ImageData.data 는 길이 W*H*4 의 Uint8ClampedArray 다.
  //    한 픽셀이 R, G, B, A 네 칸을 연속으로 차지한다 (0~255 정수).
  const image = imgCtx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data; // [r0,g0,b0,a0, r1,g1,b1,a1, ...]

  // 3) 확대 뷰 준비.
  const zoomCanvas = document.getElementById("zoom") as HTMLCanvasElement;
  const zoomCtx = zoomCanvas.getContext("2d")!;
  zoomCtx.imageSmoothingEnabled = false; // 픽셀이 또렷하게 보이도록 보간 끄기.

  // 초기 안내.
  stats.set("좌표 (x, y)", "이미지에 마우스를 올리세요");

  // 4) 마우스를 올린 픽셀 데이터를 실시간으로 표시한다.
  imgCanvas.addEventListener("mousemove", (e) => {
    // CSS 표시 크기와 캔버스 내부 해상도가 다를 수 있으므로 비율로 보정한다.
    const rect = imgCanvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;

    // 4-1) pixel index: 2D 좌표 (x, y) 를 1D 배열 인덱스로 편다.
    //      행(row) 우선 저장이므로 index = y*W + x. 각 픽셀은 4칸이라 *4.
    const pixelIndex = y * WIDTH + x;
    const i = pixelIndex * 4;

    // 4-2) 0~255 정수 RGBA.
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // 4-3) 0~1 float 색상. GPU/WGSL 은 색을 이렇게 다룬다 (255 로 나눈다).
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;
    const af = a / 255;

    // 4-4) UV 좌표. 픽셀 "중심" 을 [0,1] 범위로 정규화한다.
    //      u = (x + 0.5) / W,  v = (y + 0.5) / H.  +0.5 는 픽셀의 가운데를 가리키기 위함.
    const u = (x + 0.5) / WIDTH;
    const v = (y + 0.5) / HEIGHT;

    stats.set("좌표 (x, y)", `(${x}, ${y})`);
    stats.set("pixel index (y·W+x)", `${pixelIndex}  (배열 offset ${i})`);
    stats.set("RGBA 0~255", `(${r}, ${g}, ${b}, ${a})`);
    stats.set(
      "RGBA 0~1 float",
      `(${rf.toFixed(3)}, ${gf.toFixed(3)}, ${bf.toFixed(3)}, ${af.toFixed(3)})`,
    );
    stats.set("UV (u, v)", `(${u.toFixed(4)}, ${v.toFixed(4)})`);
    stats.set("색", "■"); // 아래에서 색을 입힌다.
    paintSwatch(stats, r, g, b);

    // 4-5) 가리킨 픽셀 주변을 확대해 그린다 (texel ↔ pixel 감각).
    drawZoom(zoomCtx, srcCanvas, x, y);
  });
}

/** 현재 픽셀 색을 stats 의 "색" 값 칸 배경에 입힌다. */
function paintSwatch(stats: HTMLElement, r: number, g: number, b: number) {
  const root = (stats as HTMLElement & { shadowRoot: ShadowRoot | null })
    .shadowRoot;
  const valueEls = root?.querySelectorAll<HTMLElement>(".value");
  if (!valueEls) return;
  // 마지막 행("색")의 value 엘리먼트에 배경색을 칠한다.
  const swatch = valueEls[valueEls.length - 1];
  swatch.style.background = `rgb(${r}, ${g}, ${b})`;
  swatch.style.color = `rgb(${r}, ${g}, ${b})`;
  swatch.style.borderRadius = "3px";
  swatch.style.padding = "0 8px";
}

/** (x, y) 주변 (2R)×(2R) 영역을 확대해 zoom 캔버스에 그리고, 중심 픽셀에 빨간 테두리를 둔다. */
function drawZoom(
  zoomCtx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  x: number,
  y: number,
) {
  const size = ZOOM_RADIUS * 2; // 16
  const sx = Math.max(0, Math.min(WIDTH - size, x - ZOOM_RADIUS));
  const sy = Math.max(0, Math.min(HEIGHT - size, y - ZOOM_RADIUS));
  const out = zoomCtx.canvas.width; // 256
  const cell = out / size; // 한 픽셀이 차지하는 화면 크기.

  zoomCtx.clearRect(0, 0, out, out);
  // 16×16 영역을 256×256 으로 확대. 보간이 꺼져 있어 각 픽셀이 네모로 보인다.
  zoomCtx.drawImage(src, sx, sy, size, size, 0, 0, out, out);

  // 가리킨 중심 픽셀에 빨간 테두리.
  zoomCtx.strokeStyle = "#ef4444";
  zoomCtx.lineWidth = 2;
  zoomCtx.strokeRect((x - sx) * cell, (y - sy) * cell, cell, cell);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
