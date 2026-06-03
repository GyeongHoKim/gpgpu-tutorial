// 실습: 아래 TODO 를 채워 "이미지 -> GPU texture -> 화면" 왕복과 uniform 버퍼 생성을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 이 챕터의 목표는 Buffer/Texture 의 "생성"과 "usage 플래그"를 이해하는 것입니다.
// (셰이더에서 실제로 읽어 쓰는 것은 10장에서 합니다.)
//
// 흐름: 입력 이미지(canvas) -> GPUTexture 업로드 -> Blitter 로 화면 표시.
//       + 작은 파라미터용 uniform 버퍼 만들기.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createTextureFromSource } from "@core/texture.ts";
import { createUniformBuffer } from "@core/buffer.ts";
import { Blitter } from "@core/blit.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";

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

  // 2) WebGPU 초기화 + 출력 캔버스 설정 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) TODO: 입력 이미지를 담을 GPUTexture 를 만드세요.
  //    이 챕터에서는 createTextureFromSource(device, srcCanvas, { width, height }) 를 쓰면 됩니다.
  //    (이 래퍼가 내부에서 어떤 usage 플래그로 device.createTexture 를 호출하는지
  //     src/core/texture.ts 를 열어 직접 확인해보세요: TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT)
  //    예: const inputTex = createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT });

  // 4) TODO: 작은 파라미터용 uniform 버퍼를 만드세요.
  //    예: const params = new Float32Array([0.5]); // colorIntensity
  //        const paramBuffer = createUniformBuffer(device, params);
  //    (이 래퍼가 UNIFORM | COPY_DST usage 로 device.createBuffer 를 호출하는 것을
  //     src/core/buffer.ts 에서 확인하세요. 16바이트 정렬도 여기서 처리합니다.)
  //    이 버퍼를 셰이더에서 실제로 읽는 것은 10장에서 합니다. 여기서는 생성까지만.

  // 5) TODO: Blitter 로 입력 텍스처를 화면(context)에 그리세요.
  //    예: const blitter = new Blitter(device, format);
  //        blitter.blit(context, inputTex);
  //    -> Blitter 는 inputTex 를 sampled texture 로 읽어 화면을 덮습니다 (왕복 완성).

  // 6) TODO: stats.set(...) 으로 texture/buffer 의 크기와 usage 를 표시하세요.

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createUniformBuffer; void Blitter;
  void context; void format;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
