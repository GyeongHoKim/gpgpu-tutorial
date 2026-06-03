// 11장 정답 코드. 입력 없이 좌표만으로 패턴을 생성하는 첫 compute shader.
//
// 흐름: (입력 없음) -> compute shader(pattern) -> 출력 storage 텍스처
//       -> 화면에 blit
// 핵심: 픽셀 하나당 invocation 하나. dispatch 개수는 dispatchSizeFor 로 계산한다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import patternShader from "../shaders/pattern.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;
const WG: [number, number] = [8, 8]; // @workgroup_size 와 반드시 같은 값.

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 출력 storage 텍스처. 입력 텍스처는 없다 — 좌표만으로 그린다.
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 3) 셰이더가 볼 이미지 크기를 uniform 으로 넘긴다.
  //    입력 텍스처가 없어 textureDimensions 를 못 쓰기 때문.
  //    Dims { size: vec2u } 는 8바이트, vec2u 정렬(8)에 맞다.
  const dimsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(dimsBuffer, 0, new Uint32Array([WIDTH, HEIGHT]));

  // 4) compute pipeline + bind group.
  const pipeline = createComputePipeline(device, patternShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: dimsBuffer } },
      { binding: 1, resource: outputTex.createView() },
    ],
  });

  // 5) dispatch 개수 계산.
  //    256×256, workgroup_size 8×8 -> ceil(256/8)=32 -> 32×32 workgroup.
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, WG);

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(gx, gy); // workgroup 을 gx×gy 개 띄운다.
  pass.end();
  device.queue.submit([encoder.finish()]);

  // 6) 결과를 화면에 그린다 (blit).
  const blitter = new Blitter(device, format);
  blitter.blit(context, outputTex);

  // 7) workgroup / invocation 개수를 화면에 보여준다 (코드와 셰이더가 일치하는지 확인용).
  const workgroups = gx * gy;
  const invocations = gx * gy * WG[0] * WG[1];
  stats.set("workgroup_size", `${WG[0]} × ${WG[1]} = ${WG[0] * WG[1]}`);
  stats.set("dispatch (workgroup)", `${gx} × ${gy} = ${workgroups}`);
  stats.set("총 invocation", `${invocations} (이미지 픽셀 ${WIDTH * HEIGHT})`);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
