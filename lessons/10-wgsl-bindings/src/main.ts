// 실습: 아래 TODO 를 채워, 입력 텍스처 + uniform 버퍼로 tint 를 적용하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 이 챕터의 핵심: WGSL 의 @group/@binding 과 JS createBindGroup 의 entries 가 1:1로 대응한다.
//   shaders/tint.wgsl:
//     @binding(0) texture_2d           (입력 텍스처)
//     @binding(1) var<uniform> Params  (tint 색 + strength)
//     @binding(2) texture_storage_2d   (출력 텍스처)
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

  // 4) TODO: uniform 버퍼를 만드세요.
  //    WGSL struct Params { tint: vec3f, strength: f32 } 에 맞춰
  //    Float32Array([r, g, b, strength]) 를 만들고 createUniformBuffer(device, params) 호출.
  //    주의: [3] 슬롯(strength)이 vec3f 뒤 패딩 자리에 들어간다 — README 의 정렬 표 참고.

  // 5) TODO: tintShader 로 compute pipeline 과 bind group 을 만드세요.
  //    entries 의 binding 번호가 WGSL 의 @binding 과 정확히 맞아야 합니다:
  //      binding 0 = 입력 텍스처 .createView()
  //      binding 1 = { buffer: paramsBuffer }
  //      binding 2 = 출력 텍스처 .createView()

  // 6) TODO: compute pass 를 인코딩하고 dispatch 하세요.
  //    힌트: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  //          pass.dispatchWorkgroups(gx, gy);

  // 7) TODO: Blitter 로 출력 텍스처를 화면(context)에 그리세요.

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture; void createUniformBuffer;
  void createComputePipeline; void dispatchSizeFor; void Blitter; void tintShader;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
