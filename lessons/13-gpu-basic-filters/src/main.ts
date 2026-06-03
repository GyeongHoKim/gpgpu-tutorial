// 실습: 아래 TODO 를 채워 GPU grayscale 을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: 입력 텍스처 -> compute shader(grayscale) -> 출력 storage 텍스처
//       -> 화면에 blit -> CPU 결과와 숫자 비교
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
  readTextureRGBA,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import { grayscale, maxAbsDiff } from "@math/color.ts";
import grayscaleShader from "../shaders/grayscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) 입력 이미지 생성 + 표시 (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) TODO: 입력 텍스처와 출력 storage 텍스처를 만드세요.
  //    힌트: createTextureFromSource(device, srcCanvas, { width, height })
  //          createStorageTexture(device, WIDTH, HEIGHT)

  // 4) TODO: grayscaleShader 로 compute pipeline 과 bind group 을 만드세요.
  //    binding 0 = 입력 텍스처 view, binding 1 = 출력 텍스처 view

  // 5) TODO: compute pass 를 인코딩하고 dispatch 하세요.
  //    힌트: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  //          pass.dispatchWorkgroups(gx, gy);

  // 6) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.

  // 7) TODO: readTextureRGBA 결과와 grayscale(...) CPU 결과를 maxAbsDiff 로 비교해
  //          stats.set("CPU vs GPU 최대차", ...) 로 표시하세요.

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture; void readTextureRGBA;
  void createComputePipeline; void dispatchSizeFor; void Blitter;
  void grayscale; void maxAbsDiff; void grayscaleShader;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
