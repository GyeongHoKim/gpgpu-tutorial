// 실습: 아래 TODO 를 채워 "좌표만으로 패턴을 그리는" compute shader 를 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: (입력 없음) -> compute shader(pattern) -> 출력 storage 텍스처 -> 화면에 blit
// 핵심 개념: 픽셀 하나당 invocation 하나. dispatch 개수 = ceil(W/8) × ceil(H/8).
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

  // 1) WebGPU 초기화 (제공됨).
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 출력 storage 텍스처를 만드세요 (입력 텍스처는 없습니다).
  //    힌트: createStorageTexture(device, WIDTH, HEIGHT)

  // 3) 셰이더가 볼 이미지 크기(width, height)를 uniform 버퍼로 만들어 채우세요.
  //    힌트: device.createBuffer({ size: 8,
  //            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  //          device.queue.writeBuffer(buf, 0, new Uint32Array([WIDTH, HEIGHT]))

  // 4) patternShader 로 compute pipeline 과 bind group 을 만드세요.
  //    binding 0 = dims uniform 버퍼, binding 1 = 출력 텍스처 view

  // 5) dispatch 개수를 계산하고 compute pass 를 인코딩/제출하세요.
  //    힌트: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, WG);
  //          pass.dispatchWorkgroups(gx, gy);

  // 6) Blitter 로 출력 텍스처를 화면(context)에 그리세요.

  // 7) (선택) workgroup / invocation 개수를 stats.set(...) 으로 표시해
  //    코드와 셰이더의 크기가 맞는지 확인하세요.

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createStorageTexture; void createComputePipeline; void dispatchSizeFor;
  void Blitter; void patternShader; void WG;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
