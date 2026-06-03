// 실습: 아래 TODO 를 채워 GPU 3x3 convolution 을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: 입력 텍스처 -> compute shader(convolution-3x3) -> 출력 storage 텍스처
//       -> 화면에 blit -> CPU(convolve3x3) 결과와 숫자 비교
//
// 이 챕터의 핵심: 5장 CPU convolution(convolve3x3) 을 WGSL 로 옮기고, 같은 kernel·같은
// clamp 규약을 써서 GPU 와 CPU 결과가 숫자로 일치하는지 확인하는 것.
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

  // 1) 입력 이미지 생성 + 표시 (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) TODO: 입력 텍스처와 출력 storage 텍스처를 만드세요. (입력≠출력 으로 분리)
  //    힌트: createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })
  //          createStorageTexture(device, WIDTH, HEIGHT)

  // 4) TODO: convolutionShader 로 compute pipeline 을, format 으로 Blitter 를 만드세요.
  //    (kernel 이 바뀌어도 pipeline·blitter 는 그대로 재사용합니다 — 루프 밖에서 한 번만.)

  // 5) CPU 비교용 입력 luma(밝기) 평면 (0~255). (제공됨 — GPU 도 같은 luma 가중치로 평면을 만든다)
  const rgba = srcCanvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT).data;
  const luma = new Float32Array(WIDTH * HEIGHT);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    luma[p] = lumaOf(rgba[i], rgba[i + 1], rgba[i + 2]);
  }

  async function apply(name: KernelName) {
    const kernel = KERNELS[name] as Kernel3x3;
    const bias = 0;

    // 6) TODO: kernel 9개 값 + bias 를 storage buffer 로 셰이더에 전달하세요.
    //    힌트: const kernelData = new Float32Array([...kernel, bias]);
    //          const kernelBuffer = createStorageBuffer(device, kernelData);
    //    레이아웃: data[0..8] = K0..K8, data[9] = bias. (셰이더의 array<f32, 10> 와 일치)

    // 7) TODO: bind group 을 만드세요.
    //    binding 0 = 입력 텍스처 view, binding 1 = 출력 텍스처 view,
    //    binding 2 = { buffer: kernelBuffer }

    // 8) TODO: compute pass 를 인코딩하고 dispatch 하세요. measureGpuMs 로 시간을 재세요.
    //    힌트: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
    //          pass.dispatchWorkgroups(gx, gy);

    // 9) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.

    // 10) TODO: CPU 비교.
    //     convolve3x3(luma, WIDTH, HEIGHT, kernel, bias) 로 CPU 평면을 구하고,
    //     0~255 로 clamp·round 해 RGBA(Uint8ClampedArray)로 만든 뒤,
    //     readTextureRGBA(...) 결과와 maxAbsDiff 로 비교해 stats 에 표시하세요.
    //     (sharpen/edge 는 음수가 흔하므로 clamp 가 두 쪽 모두 필요합니다.)

    stats.set("kernel", name);
    stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  }

  select.addEventListener("change", () => void apply(select.value as KernelName));
  await apply(select.value as KernelName);

  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture; void readTextureRGBA;
  void createComputePipeline; void dispatchSizeFor; void createStorageBuffer;
  void Blitter; void measureGpuMs; void maxAbsDiff; void convolve3x3;
  void convolutionShader;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
