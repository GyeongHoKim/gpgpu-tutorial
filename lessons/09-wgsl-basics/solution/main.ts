// 9장 정답 코드.
// 입력 텍스처 없이, basics.wgsl 이 픽셀 좌표만으로 색을 계산해 출력 storage 텍스처에 쓴다.
// 보일러플레이트(pipeline/dispatch/표시)는 src/core 헬퍼를 그대로 재사용한다.
// 이 챕터의 핵심은 main.ts 가 아니라 shaders/basics.wgsl 의 "문법"이다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import basicsShader from "../shaders/basics.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) WebGPU 초기화 + 출력 캔버스 설정.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 출력 storage 텍스처. 이 챕터는 입력 텍스처가 없다(좌표로 색을 "생성").
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 3) basics.wgsl 로 compute pipeline + bind group.
  //    binding 0 = 출력 텍스처 view 하나뿐이다.
  const pipeline = createComputePipeline(device, basicsShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: outputTex.createView() }],
  });

  // 4) compute pass dispatch. "픽셀 하나당 invocation 하나" 모델.
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(gx, gy);
  pass.end();
  device.queue.submit([encoder.finish()]);

  // 5) 결과를 화면에 그린다 (검증된 blit 경로만 사용, buffer readback 없음).
  const blitter = new Blitter(device, format);
  blitter.blit(context, outputTex);

  stats.set("출력 크기", `${WIDTH}×${HEIGHT}`);
  stats.set("workgroup", "8×8");
  stats.set("dispatch", `${gx}×${gy}`);
  stats.set("상태", "✅ 좌표 → 색 계산 완료");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
