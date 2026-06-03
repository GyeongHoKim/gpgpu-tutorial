// 10장 정답 코드. WGSL 주소 공간과 바인딩(@group/@binding/uniform/texture/storage)의 전체 흐름.
//
// 흐름: 입력 텍스처(texture_2d) + uniform 버퍼(Params) -> compute shader(tint)
//       -> 출력 storage 텍스처(texture_storage_2d) -> 화면에 blit
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
} from "@core/texture.ts";
import { createUniformBuffer } from "@core/buffer.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import tintShader from "../shaders/tint.wgsl" with { type: "text" };

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
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

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

  // 4) uniform 버퍼: WGSL struct Params { tint: vec3f, strength: f32 } 에 대응.
  //
  //    Float32Array 슬롯 ↔ WGSL 필드 (바이트 오프셋):
  //      [0] = tint.r     (offset 0)
  //      [1] = tint.g     (offset 4)
  //      [2] = tint.b     (offset 8)
  //      [3] = strength   (offset 12)  ← vec3f(16바이트 정렬) 뒤 패딩 자리에 딱 들어간다
  //
  //    여기서는 [r,g,b,strength] 4개가 우연히 16바이트에 정확히 맞는다.
  //    (왜 "우연히" 인지, 언제 패딩이 필요한지는 README 의 정렬 표를 반드시 보라.)
  const tint = [0.13, 0.83, 0.93]; // 청록(cyan) 색조
  const strength = 0.45; // 0=원본, 1=완전히 tint 색
  const params = new Float32Array([tint[0], tint[1], tint[2], strength]);
  const paramsBuffer = createUniformBuffer(device, params);

  // 5) compute pipeline + bind group.
  //    @binding 번호와 entries 의 binding 이 1:1로 대응한다 (이 챕터의 핵심).
  const pipeline = createComputePipeline(device, tintShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTex.createView() }, // @binding(0) texture_2d
      { binding: 1, resource: { buffer: paramsBuffer } }, // @binding(1) var<uniform>
      { binding: 2, resource: outputTex.createView() }, // @binding(2) texture_storage_2d
    ],
  });

  // 6) compute pass dispatch.
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(gx, gy);
  pass.end();
  device.queue.submit([encoder.finish()]);

  // 7) 결과를 화면에 그린다 (blit).
  const blitter = new Blitter(device, format);
  blitter.blit(context, outputTex);

  stats.set("tint (r,g,b)", `(${tint[0]}, ${tint[1]}, ${tint[2]})`);
  stats.set("strength", strength.toFixed(2));
  stats.set("uniform 크기", `${params.byteLength} bytes`);
  stats.set("바인딩", "@binding 0/1/2 = texture / uniform / storage");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
