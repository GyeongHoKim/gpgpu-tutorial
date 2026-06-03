// 실습: 아래 TODO 를 채워, 입력 텍스처를 그대로 복사하는 compute pipeline 을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 이 챕터의 핵심은 "무엇을 계산하는가"가 아니라(복사라 변환이 없습니다),
// bind group / pipeline / dispatch 의 와이어링을 직접 손으로 적어보는 것입니다.
//
// 흐름: 입력 텍스처 -> compute shader(copy) -> 출력 storage 텍스처 -> 화면에 blit
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import copyShader from "../shaders/copy.wgsl" with { type: "text" };

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
  //    힌트: createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })
  //          createStorageTexture(device, WIDTH, HEIGHT)
  //    주의: 입력과 출력은 반드시 서로 다른 텍스처여야 합니다.

  // 4) TODO: copyShader 로 compute pipeline 을 만드세요.
  //    힌트: createComputePipeline(device, copyShader)

  // 5) TODO: bind group 을 만드세요.
  //    layout 은 pipeline.getBindGroupLayout(0) 을 씁니다.
  //    entries 의 binding 번호는 셰이더(copy.wgsl)의 @binding 번호와 정확히 일치해야 합니다:
  //      binding 0 = 입력 텍스처 .createView()
  //      binding 1 = 출력 텍스처 .createView()

  // 6) TODO: compute pass 를 직접 인코딩하고 dispatch 하세요.
  //    const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  //    const encoder = device.createCommandEncoder();
  //    const pass = encoder.beginComputePass();
  //    pass.setPipeline(...); pass.setBindGroup(0, ...); pass.dispatchWorkgroups(gx, gy);
  //    pass.end(); device.queue.submit([encoder.finish()]);

  // 7) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.
  //    const blitter = new Blitter(device, format);
  //    blitter.blit(context, outputTex);

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture;
  void createComputePipeline; void dispatchSizeFor; void Blitter;
  void copyShader;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
