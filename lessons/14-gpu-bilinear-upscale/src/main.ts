// 실습: 아래 TODO 를 채워 GPU 2x bilinear upscale 을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: 작은 입력 텍스처(128×128) -> compute shader(bilinear) -> 출력 storage 텍스처(256×256)
//       -> 화면에 blit -> CPU 의 bilinearUpscale 결과와 숫자 비교
//
// 핵심: GPU 셰이더(shaders/bilinear-upscale.wgsl)의 좌표 규약이
//       src/math/upscale.ts 의 bilinearUpscale 와 "정확히" 같아야 비교가 통과합니다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
  readTextureRGBA,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import { maxAbsDiff } from "@math/color.ts";
import { bilinearUpscale, type Plane } from "@math/upscale.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const IN_W = 128;
const IN_H = 128;
const SCALE = 2;
const OUT_W = IN_W * SCALE; // 256
const OUT_H = IN_H * SCALE; // 256

/** RGBA 이미지에서 채널 하나(0=R,1=G,2=B,3=A)를 float 평면으로 뽑는다. (제공됨) */
function extractChannel(rgba: Uint8ClampedArray, ch: number, n: number): Float32Array {
  const plane = new Float32Array(n);
  for (let p = 0; p < n; p++) plane[p] = rgba[p * 4 + ch];
  return plane;
}

/**
 * CPU 기준: R,G,B,A 네 채널을 각각 bilinearUpscale 한 뒤 RGBA(Uint8)로 합친다. (제공됨)
 * 양자화 비교를 위해 채널 값은 0~255 로 round/clamp 한다.
 */
function upscaleRGBA(rgba: Uint8ClampedArray): Uint8Array {
  const n = IN_W * IN_H;
  const planes: Plane[] = [];
  for (let ch = 0; ch < 4; ch++) {
    planes.push(bilinearUpscale(extractChannel(rgba, ch, n), IN_W, IN_H, SCALE));
  }
  const out = new Uint8Array(OUT_W * OUT_H * 4);
  for (let p = 0; p < OUT_W * OUT_H; p++) {
    for (let ch = 0; ch < 4; ch++) {
      const v = Math.round(planes[ch].data[p]);
      out[p * 4 + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return out;
}

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) 작은 입력 이미지(128×128) 생성 + 표시 (제공됨)
  const srcCanvas = makeTestImageCanvas(IN_W, IN_H);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);
  const srcPixels = srcCanvas
    .getContext("2d")!
    .getImageData(0, 0, IN_W, IN_H).data;

  // 2) WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) TODO: 입력 텍스처(작게)와 출력 storage 텍스처(2배 크게)를 만드세요.
  //    힌트: createTextureFromSource(device, srcCanvas, { width: IN_W, height: IN_H })
  //          createStorageTexture(device, OUT_W, OUT_H)

  // 4) TODO: bilinearShader 로 compute pipeline 과 bind group 을 만드세요.
  //    binding 0 = 입력 텍스처 view, binding 1 = 출력 텍스처 view

  // 5) TODO: compute pass 를 인코딩하고 dispatch 하세요.
  //    주의: dispatch 개수는 "출력" 크기 기준입니다.
  //          const [gx, gy] = dispatchSizeFor(OUT_W, OUT_H, [8, 8]);
  //          pass.dispatchWorkgroups(gx, gy);
  //    시간 측정은 measureGpuMs(device, () => { ... }) 로 감싸세요.

  // 6) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.

  // 7) TODO: readTextureRGBA(device, outputTex, OUT_W, OUT_H) 결과와
  //          upscaleRGBA(srcPixels) CPU 결과를 maxAbsDiff 로 비교해
  //          stats.set("CPU vs GPU 최대차", ...) 로 표시하세요. (오차 ≤ 3 이면 일치)

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture; void readTextureRGBA;
  void createComputePipeline; void dispatchSizeFor; void Blitter; void measureGpuMs;
  void maxAbsDiff; void bilinearShader; void upscaleRGBA;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
