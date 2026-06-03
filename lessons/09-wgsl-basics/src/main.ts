// 실습: 아래 TODO 를 채워, basics.wgsl 이 계산한 색을 화면에 띄우세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: (입력 없음) -> compute shader(basics.wgsl, 좌표로 색 계산)
//       -> 출력 storage 텍스처 -> 화면에 blit
//
// 이 챕터의 진짜 학습 대상은 main.ts 가 아니라 shaders/basics.wgsl 입니다.
// README 를 보며 basics.wgsl 의 문법을 한 줄씩 읽은 뒤, 아래 보일러플레이트를 채우세요.
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

  // 1) WebGPU 초기화 + 출력 캔버스 설정 (제공됨).
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) TODO: 출력 storage 텍스처를 만드세요.
  //    힌트: createStorageTexture(device, WIDTH, HEIGHT)

  // 3) TODO: basicsShader 로 compute pipeline 과 bind group 을 만드세요.
  //    이 셰이더는 binding 0 = 출력 텍스처 view 하나만 씁니다 (입력 텍스처 없음).

  // 4) TODO: compute pass 를 인코딩하고 dispatch 하세요.
  //    힌트: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  //          encoder -> beginComputePass -> setPipeline -> setBindGroup(0, ...) ->
  //          dispatchWorkgroups(gx, gy) -> end -> device.queue.submit([encoder.finish()])

  // 5) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.
  //    힌트: const blitter = new Blitter(device, format); blitter.blit(context, outputTex);

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createStorageTexture; void createComputePipeline; void dispatchSizeFor;
  void Blitter; void basicsShader;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
