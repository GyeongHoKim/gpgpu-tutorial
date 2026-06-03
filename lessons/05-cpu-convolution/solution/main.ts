// 5장 정답 코드. CPU 로 3x3 convolution 을 적용하는 전체 흐름을 보여준다.
//
// 흐름: 입력 이미지(canvas) -> luma 평면(plane) 으로 변환
//       -> 선택한 KERNELS 로 convolve3x3 (src/math/convolution.ts 재사용)
//       -> 0~255 로 clamp -> 결과 canvas 에 그리기
//
// WebGPU 는 쓰지 않는다. 같은 convolve3x3 를 15장에서 GPU(WGSL)로 다시 구현해 숫자로 비교한다.
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

  // 1) 입력 이미지를 코드로 생성하고 원본 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) 입력을 luma(밝기) 평면으로 변환한다.
  //    convolution 의 의미를 한 채널로 먼저 또렷하게 보기 위해, RGB 3채널 대신
  //    밝기 한 평면(길이 WIDTH*HEIGHT)에 필터를 적용한다.
  const rgba = srcCanvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT).data;
  const luma = new Float32Array(WIDTH * HEIGHT);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    luma[p] = lumaOf(rgba[i], rgba[i + 1], rgba[i + 2]);
  }

  // 3) 선택한 kernel 로 convolution 을 적용하고 결과를 그린다.
  function apply(name: KernelName) {
    const kernel = KERNELS[name] as Kernel3x3;

    const t0 = performance.now();
    // convolve3x3 가 핵심이다: 각 출력 픽셀 = 주변 3x3 luma 벡터와 kernel 벡터의 내적.
    const result = convolve3x3(luma, WIDTH, HEIGHT, kernel);
    const cpuMs = performance.now() - t0;

    // 결과는 음수/255 초과가 나올 수 있으므로 0~255 로 clamp 한 뒤 그린다.
    // (특히 sharpen/edge 는 음수가 흔하다. clamp 하지 않으면 색이 뒤집혀 보인다.)
    const out = outCtx.createImageData(WIDTH, HEIGHT);
    for (let p = 0; p < result.length; p++) {
      const v = Math.max(0, Math.min(255, Math.round(result[p])));
      out.data[p * 4 + 0] = v;
      out.data[p * 4 + 1] = v;
      out.data[p * 4 + 2] = v;
      out.data[p * 4 + 3] = 255;
    }
    outCtx.putImageData(out, 0, 0);

    stats.set("kernel", name);
    stats.set("CPU 시간", `${cpuMs.toFixed(2)} ms`);
    stats.set("출력 픽셀", `${WIDTH * HEIGHT}개`);
  }

  // 4) 셀렉트가 바뀔 때마다 다시 적용한다. (state + 자동 리렌더 없음 → 직접 갱신)
  select.addEventListener("change", () => apply(select.value as KernelName));
  apply(select.value as KernelName); // 첫 렌더
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
