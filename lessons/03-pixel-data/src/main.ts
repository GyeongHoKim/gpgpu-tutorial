// 실습: 아래 TODO 를 채워 "마우스를 올린 픽셀의 값" 을 표시하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
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

  // 1) 테스트 이미지를 코드로 생성하고 표시 캔버스에 그린다. (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  const imgCanvas = document.getElementById("img") as HTMLCanvasElement;
  const imgCtx = imgCanvas.getContext("2d")!;
  imgCtx.drawImage(srcCanvas, 0, 0);

  // 2) 픽셀 데이터를 한 번만 읽어 둔다. (제공됨)
  //    ImageData.data 는 길이 W*H*4 의 Uint8ClampedArray 다.
  //    한 픽셀이 R, G, B, A 네 칸을 연속으로 차지한다 (0~255 정수).
  const image = imgCtx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data; // [r0,g0,b0,a0, r1,g1,b1,a1, ...]

  // 3) 확대 뷰 준비. (제공됨)
  const zoomCanvas = document.getElementById("zoom") as HTMLCanvasElement;
  const zoomCtx = zoomCanvas.getContext("2d")!;
  zoomCtx.imageSmoothingEnabled = false;

  stats.set("좌표 (x, y)", "이미지에 마우스를 올리세요");

  imgCanvas.addEventListener("mousemove", (e) => {
    // 마우스 위치 -> 픽셀 좌표 (x, y). (제공됨)
    const rect = imgCanvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;

    // ── 여기서부터 TODO ───────────────────────────────────────────

    // TODO 1) pixel index 와 배열 offset 을 구하세요.
    //   2D 좌표 (x, y) 를 1D 배열 인덱스로 펴면 index = y*W + x (행 우선 저장).
    //   각 픽셀은 R,G,B,A 4칸이므로 배열 offset 은 index*4 입니다.
    const pixelIndex = 0; // TODO: y * WIDTH + x
    const i = 0; // TODO: pixelIndex * 4

    // TODO 2) 0~255 정수 RGBA 를 data 에서 꺼내세요.
    //   data[i], data[i+1], data[i+2], data[i+3] 이 각각 R, G, B, A 입니다.
    const r = 0; // TODO
    const g = 0; // TODO
    const b = 0; // TODO
    const a = 0; // TODO

    // TODO 3) 0~1 float 색상으로 변환하세요. (255 로 나눕니다)
    const rf = 0; // TODO: r / 255
    const gf = 0; // TODO
    const bf = 0; // TODO
    const af = 0; // TODO

    // TODO 4) UV 좌표를 구하세요. 픽셀 "중심" 을 [0,1] 로 정규화합니다.
    //   u = (x + 0.5) / W,  v = (y + 0.5) / H
    const u = 0; // TODO
    const v = 0; // TODO

    // ── TODO 끝 ──────────────────────────────────────────────────

    stats.set("좌표 (x, y)", `(${x}, ${y})`);
    stats.set("pixel index (y·W+x)", `${pixelIndex}  (배열 offset ${i})`);
    stats.set("RGBA 0~255", `(${r}, ${g}, ${b}, ${a})`);
    stats.set(
      "RGBA 0~1 float",
      `(${rf.toFixed(3)}, ${gf.toFixed(3)}, ${bf.toFixed(3)}, ${af.toFixed(3)})`,
    );
    stats.set("UV (u, v)", `(${u.toFixed(4)}, ${v.toFixed(4)})`);

    drawZoom(zoomCtx, srcCanvas, x, y);
  });
}

/** (x, y) 주변 (2R)×(2R) 영역을 확대해 zoom 캔버스에 그리고, 중심 픽셀에 빨간 테두리를 둔다. (제공됨) */
function drawZoom(
  zoomCtx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  x: number,
  y: number,
) {
  const size = ZOOM_RADIUS * 2;
  const sx = Math.max(0, Math.min(WIDTH - size, x - ZOOM_RADIUS));
  const sy = Math.max(0, Math.min(HEIGHT - size, y - ZOOM_RADIUS));
  const out = zoomCtx.canvas.width;
  const cell = out / size;

  zoomCtx.clearRect(0, 0, out, out);
  zoomCtx.drawImage(src, sx, sy, size, size, 0, 0, out, out);

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
