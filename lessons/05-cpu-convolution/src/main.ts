// 실습: 아래 TODO 를 채워 CPU convolution 데모를 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: 입력 이미지(canvas) -> luma 평면(plane) 으로 변환
//       -> 선택한 KERNELS 로 convolve3x3 (src/math/convolution.ts 재사용)
//       -> 0~255 로 clamp -> 결과 canvas 에 그리기
//
// WebGPU 는 쓰지 않습니다. 순수 2D canvas + TypeScript 입니다.
import { makeTestImageCanvas } from "@core/test-image.ts";
import { lumaOf } from "@math/color.ts";
import { convolve3x3, KERNELS } from "@math/convolution.ts";
import type { Kernel3x3 } from "@math/convolution.ts";

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;

type KernelName = keyof typeof KERNELS;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const select = document.getElementById("kernel") as HTMLSelectElement;
  const outCanvas = document.getElementById("out") as HTMLCanvasElement;
  const outCtx = outCanvas.getContext("2d")!;

  // 1) 입력 이미지를 코드로 생성하고 원본 캔버스에 그린다. (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) TODO: 입력을 luma(밝기) 평면으로 변환하세요.
  //    힌트: srcCanvas 의 getImageData 로 RGBA 를 얻고, lumaOf(r, g, b) 로
  //          길이 WIDTH*HEIGHT 인 Float32Array(luma) 를 채우세요.
  const rgba = srcCanvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT).data;
  const luma = new Float32Array(WIDTH * HEIGHT);
  // ... 여기를 채우세요 ...

  // 3) 선택한 kernel 로 convolution 을 적용하고 결과를 그린다.
  function apply(name: KernelName) {
    const kernel = KERNELS[name] as Kernel3x3;

    // TODO: convolve3x3(luma, WIDTH, HEIGHT, kernel) 로 결과 평면을 계산하세요.
    //       각 출력 픽셀 = 주변 3x3 luma 벡터와 kernel 벡터의 내적 입니다.
    const result = convolve3x3(luma, WIDTH, HEIGHT, kernel);

    // TODO: result 를 0~255 로 clamp 해서 outCtx 에 그리세요.
    //       힌트: createImageData / putImageData, v = max(0, min(255, round(result[p])))
    //       sharpen/edge 는 음수가 흔하므로 clamp 를 빼면 색이 뒤집혀 보입니다.
    const out = outCtx.createImageData(WIDTH, HEIGHT);
    // ... 여기를 채우세요 ...
    outCtx.putImageData(out, 0, 0);

    stats.set("kernel", name);
  }

  // 4) 셀렉트가 바뀔 때마다 다시 적용한다. (state + 자동 리렌더 없음 → 직접 갱신)
  select.addEventListener("change", () => apply(select.value as KernelName));
  apply(select.value as KernelName); // 첫 렌더

  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void luma;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
