// 14장 정답 코드. GPU 2x bilinear upscale 의 전체 흐름을 보여준다.
//
// 흐름: 작은 입력 텍스처(128×128) -> compute shader(bilinear/nearest)
//       -> 출력 storage 텍스처(256×256) -> 화면에 blit
//       -> CPU 기준(upscale.ts)과 숫자 비교
//
// 핵심: GPU 셰이더(shaders/bilinear-upscale.wgsl)의 좌표 규약이
//       src/math/upscale.ts 의 bilinearUpscale 와 "정확히" 같아야 비교가 통과한다.
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
import { bilinearUpscale, nearestUpscale, type Plane } from "@math/upscale.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };
import nearestShader from "../shaders/nearest-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const IN_W = 128;
const IN_H = 128;
const SCALE = 2;
const OUT_W = IN_W * SCALE; // 256
const OUT_H = IN_H * SCALE; // 256

/** RGBA 이미지에서 채널 하나(0=R,1=G,2=B,3=A)를 float 평면으로 뽑는다. */
function extractChannel(rgba: Uint8ClampedArray, ch: number, n: number): Float32Array {
  const plane = new Float32Array(n);
  for (let p = 0; p < n; p++) plane[p] = rgba[p * 4 + ch];
  return plane;
}

/**
 * upscale.ts 함수들은 "단일 채널 평면" 기준이다. GPU 비교 기준을 만들려면
 * R,G,B,A 네 채널을 각각 확대한 뒤 다시 RGBA(Uint8)로 합친다.
 * 양자화 비교를 위해 채널 값은 0~255 로 round/clamp 한다.
 */
function upscaleRGBA(
  rgba: Uint8ClampedArray,
  fn: (p: ArrayLike<number>, w: number, h: number, s: number) => Plane,
): Uint8Array {
  const n = IN_W * IN_H;
  const planes: Plane[] = [];
  for (let ch = 0; ch < 4; ch++) {
    planes.push(fn(extractChannel(rgba, ch, n), IN_W, IN_H, SCALE));
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
  const modeSel = document.getElementById("mode") as HTMLSelectElement;

  // 1) 작은 입력 이미지(128×128)를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(IN_W, IN_H);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 입력 픽셀(RGBA 0~255)을 한 번만 읽어 둔다 (CPU 기준 계산용).
  const srcPixels = srcCanvas
    .getContext("2d")!
    .getImageData(0, 0, IN_W, IN_H).data;

  // 2) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) 입력 텍스처(작게) + 출력 storage 텍스처(2배 크게).
  const inputTex = createTextureFromSource(device, srcCanvas, {
    width: IN_W,
    height: IN_H,
  });
  const outputTex = createStorageTexture(device, OUT_W, OUT_H);

  // 4) 두 모드의 compute pipeline 을 미리 만들어 둔다.
  const pipelines = {
    bilinear: createComputePipeline(device, bilinearShader),
    nearest: createComputePipeline(device, nearestShader),
  };
  const blitter = new Blitter(device, format);

  // dispatch 는 출력 크기(256×256) 기준으로 계산한다 (출력 픽셀 1개 = invocation 1개).
  const [gx, gy] = dispatchSizeFor(OUT_W, OUT_H, [8, 8]);

  async function run(mode: "bilinear" | "nearest") {
    const pipeline = pipelines[mode];
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTex.createView() },
        { binding: 1, resource: outputTex.createView() },
      ],
    });

    // 5) compute pass dispatch + 시간 측정.
    const gpuMs = await measureGpuMs(device, () => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(gx, gy);
      pass.end();
      device.queue.submit([encoder.finish()]);
    });

    // 6) 결과를 화면에 그린다 (blit).
    blitter.blit(context, outputTex);

    // 7) CPU 기준과 숫자로 비교한다 (눈이 아니라 숫자로).
    //    GPU 셰이더와 똑같은 좌표 규약의 CPU 함수를 채널별로 적용한다.
    const cpuFn = mode === "bilinear" ? bilinearUpscale : nearestUpscale;
    const cpuPixels = upscaleRGBA(srcPixels, cpuFn);
    const gpuPixels = await readTextureRGBA(device, outputTex, OUT_W, OUT_H);
    const diff = maxAbsDiff(cpuPixels, gpuPixels);

    stats.set("모드", mode);
    stats.set("출력 크기", `${OUT_W} x ${OUT_H}`);
    stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
    stats.set("CPU vs GPU 최대차", `${diff} / 255`);
    // rgba8unorm 양자화 + round 경계 때문에 2~3 정도의 오차는 정상이다.
    stats.set("판정", diff <= 3 ? "✅ 일치 (오차 ≤ 3)" : "⚠️ 차이가 큼");
  }

  modeSel.addEventListener("change", () => {
    void run(modeSel.value as "bilinear" | "nearest");
  });
  await run("bilinear"); // 첫 렌더
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
