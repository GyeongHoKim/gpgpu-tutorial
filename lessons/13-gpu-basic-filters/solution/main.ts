// 13장 정답 코드. GPU grayscale 의 전체 흐름을 보여준다.
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

  // 1) 입력 이미지를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  const srcDisplay = document.getElementById("src") as HTMLCanvasElement;
  srcDisplay.getContext("2d")!.drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) 입력 텍스처(읽기) + 출력 storage 텍스처(쓰기).
  const inputTex = createTextureFromSource(device, srcCanvas, {
    width: WIDTH,
    height: HEIGHT,
  });
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 4) compute pipeline + bind group.
  const pipeline = createComputePipeline(device, grayscaleShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTex.createView() },
      { binding: 1, resource: outputTex.createView() },
    ],
  });

  // 5) compute pass dispatch + 시간 측정.
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
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
  const blitter = new Blitter(device, format);
  blitter.blit(context, outputTex);

  // 7) CPU 기준과 숫자로 비교한다 (눈이 아니라 숫자로).
  const srcPixels = srcCanvas
    .getContext("2d")!
    .getImageData(0, 0, WIDTH, HEIGHT).data;
  const cpuGray = grayscale(srcPixels);
  const gpuPixels = await readTextureRGBA(device, outputTex, WIDTH, HEIGHT);
  const diff = maxAbsDiff(cpuGray, gpuPixels);

  stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
  stats.set("CPU vs GPU 최대차", `${diff} / 255`);
  // rgba8unorm 양자화 때문에 1~2 정도의 오차는 정상이다.
  stats.set("판정", diff <= 2 ? "✅ 일치 (오차 ≤ 2)" : "⚠️ 차이가 큼");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
