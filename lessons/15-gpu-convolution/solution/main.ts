// 15장 정답 코드. GPU 로 3x3 convolution 을 적용하는 전체 흐름을 보여준다.
//
// 흐름: 입력 텍스처 -> compute shader(convolution-3x3) -> 출력 storage 텍스처
//       -> 화면에 blit -> CPU(convolve3x3) 결과와 숫자 비교
//
// 5장의 CPU convolution(convolve3x3) 을 WGSL 로 옮긴 것이다. 같은 kernel·같은 clamp 규약을
// 써서, 같은 표현(luma 평면)에서 GPU 와 CPU 결과가 일치하는지 maxAbsDiff 로 확인한다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
  readTextureRGBA,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { createStorageBuffer } from "@core/buffer.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import { lumaOf, maxAbsDiff } from "@math/color.ts";
import { convolve3x3, KERNELS } from "@math/convolution.ts";
import type { Kernel3x3 } from "@math/convolution.ts";
import convolutionShader from "../shaders/convolution-3x3.wgsl" with { type: "text" };

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

  // 1) 입력 이미지를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) 입력 텍스처(읽기) + 출력 storage 텍스처(쓰기). 입력≠출력 으로 분리한다.
  const inputTex = createTextureFromSource(device, srcCanvas, {
    width: WIDTH,
    height: HEIGHT,
  });
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 4) compute pipeline. 셰이더는 kernel 이 바뀌어도 그대로 재사용한다.
  const pipeline = createComputePipeline(device, convolutionShader);
  const blitter = new Blitter(device, format);

  // 5) CPU 비교용 입력 luma(밝기) 평면 (0~255). GPU 도 같은 luma 가중치로 평면을 만든다.
  const rgba = srcCanvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT).data;
  const luma = new Float32Array(WIDTH * HEIGHT);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    luma[p] = lumaOf(rgba[i], rgba[i + 1], rgba[i + 2]);
  }

  async function apply(name: KernelName) {
    const kernel = KERNELS[name] as Kernel3x3;
    const bias = 0;

    // 5-a) kernel 9개 값 + bias 를 storage buffer 로 셰이더에 전달한다.
    //      레이아웃: data[0..8] = K0..K8, data[9] = bias. (셰이더의 array<f32, 10> 와 일치)
    const kernelData = new Float32Array([...kernel, bias]);
    const kernelBuffer = createStorageBuffer(device, kernelData);

    // 5-b) bind group: 입력 텍스처 / 출력 텍스처 / kernel storage buffer.
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTex.createView() },
        { binding: 1, resource: outputTex.createView() },
        { binding: 2, resource: { buffer: kernelBuffer } },
      ],
    });

    // 5-c) compute pass dispatch + 시간 측정.
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

    // 6) 결과를 화면에 그린다.
    blitter.blit(context, outputTex);

    // 7) CPU 기준과 숫자로 비교한다.
    //    GPU 는 0~1 에서 계산 후 rgba8unorm 으로 0~255 저장. CPU 도 같은 luma 평면에
    //    같은 kernel·clamp 로 convolve3x3 한 뒤, 0~255 로 clamp·round 해 같은 표현으로 맞춘다.
    //    (sharpen/edge 는 음수가 흔하다. 그리기 전 clamp 가 두 쪽 모두 필요하다.)
    const cpuPlane = convolve3x3(luma, WIDTH, HEIGHT, kernel, bias);
    const cpuRGBA = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let p = 0; p < cpuPlane.length; p++) {
      const v = Math.max(0, Math.min(255, Math.round(cpuPlane[p])));
      cpuRGBA[p * 4 + 0] = v;
      cpuRGBA[p * 4 + 1] = v;
      cpuRGBA[p * 4 + 2] = v;
      cpuRGBA[p * 4 + 3] = 255;
    }
    const gpuPixels = await readTextureRGBA(device, outputTex, WIDTH, HEIGHT);
    const diff = maxAbsDiff(cpuRGBA, gpuPixels);

    stats.set("kernel", name);
    stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
    stats.set("texture read", `픽셀당 9회 (3x3)`);
    stats.set("CPU vs GPU 최대차", `${diff} / 255`);
    // rgba8unorm 양자화 + 0~255 round 때문에 작은 오차는 정상. 여유를 두고 판정한다.
    stats.set("판정", diff <= 3 ? "✅ 일치 (오차 ≤ 3)" : "⚠️ 차이가 큼");

    kernelBuffer.destroy();
  }

  // 셀렉트가 바뀔 때마다 다시 적용한다. (state + 자동 리렌더 없음 → 직접 갱신)
  select.addEventListener("change", () => void apply(select.value as KernelName));
  await apply(select.value as KernelName); // 첫 렌더
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
