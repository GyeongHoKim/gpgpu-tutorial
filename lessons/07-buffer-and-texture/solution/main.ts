// 7장 정답 코드. Buffer 와 Texture 의 "생성"과 "usage 플래그"에 집중한다.
//
// 흐름: 입력 이미지(canvas) -> GPUTexture 에 업로드 -> Blitter 로 화면에 표시.
//       (이미지 -> GPU texture -> 화면, 텍스처 왕복)
// 그리고 작은 파라미터용 uniform 버퍼를 만들어 "버퍼는 이렇게 만든다"를 보여준다.
//
// 이 챕터에서 일부러 raw device.createTexture / device.createBuffer 를 직접 호출한다.
// src/core/texture.ts 의 createTextureFromSource 와 src/core/buffer.ts 의
// createUniformBuffer 가 바로 이 raw 호출을 감싼 것임을 눈으로 확인하기 위해서다.
// (실제 챕터 코드는 이렇게 매번 손으로 짜지 않고 그 래퍼를 쓴다 — 아래 6) 참고)
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

  // 1) 입력 이미지를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  const srcDisplay = document.getElementById("src") as HTMLCanvasElement;
  srcDisplay.getContext("2d")!.drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화 + 출력 캔버스 설정.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) [핵심] GPUTexture 를 raw 로 직접 만든다.
  //    usage 플래그가 이 텍스처로 무엇을 할 수 있는지를 결정한다.
  //    - TEXTURE_BINDING : 셰이더에서 sampled texture 로 읽기(=blit 이 샘플링)
  //    - COPY_DST        : copyExternalImageToTexture 로 이미지 데이터를 받기
  //    - RENDER_ATTACHMENT: copyExternalImageToTexture 가 내부적으로 요구
  //    필요한 usage 를 빠뜨리면 validation error 가 난다 (README 의 usage 표 참고).
  const inputTex = device.createTexture({
    size: [WIDTH, HEIGHT],
    format: "rgba8unorm", // 이미지 색을 0~255 -> 0~1 로 담는 표준 포맷
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // 이미지(canvas) 픽셀을 방금 만든 텍스처로 복사한다 (CPU -> GPU 업로드).
  device.queue.copyExternalImageToTexture(
    { source: srcCanvas, flipY: false },
    { texture: inputTex },
    [WIDTH, HEIGHT],
  );

  // 위 3) 전체가 사실 src/core/texture.ts 의 createTextureFromSource 한 줄과 같다.
  // 실무 챕터에서는 이렇게 래퍼를 쓴다 (결과는 동일):
  const inputTexViaHelper = createTextureFromSource(device, srcCanvas, {
    width: WIDTH,
    height: HEIGHT,
  });

  // 4) [핵심] GPUBuffer 를 raw 로 직접 만든다 (작은 파라미터 묶음).
  //    여기서는 "색 강도" 하나(f32) 만 담는 uniform 버퍼를 만든다.
  //    - UNIFORM  : 셰이더에서 uniform 으로 읽기 위한 usage
  //    - COPY_DST : queue.writeBuffer 로 값을 써넣기 위한 usage
  //    이 버퍼를 실제로 셰이더에서 읽어 쓰는 것은 10장(주소 공간과 바인딩)에서 한다.
  //    이 챕터의 목표는 "버퍼는 이렇게 만들고 채운다"까지다.
  const params = new Float32Array([0.5]); // colorIntensity = 0.5
  const paramBuffer = device.createBuffer({
    // uniform 버퍼는 16바이트 정렬을 권장한다 (자세한 이유는 10장).
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(paramBuffer, 0, params);

  // 위 4) 도 src/core/buffer.ts 의 createUniformBuffer 가 감싼 것이다 (정렬 패딩까지 처리):
  const paramBufferViaHelper = createUniformBuffer(device, params);

  // 5) 결과를 화면에 그린다.
  //    Blitter 는 inputTex 를 sampled texture(TEXTURE_BINDING)로 읽어 화면을 덮는다.
  //    -> 텍스처 왕복 완성: 이미지 -> GPU texture -> 화면.
  const blitter = new Blitter(device, format);
  blitter.blit(context, inputTex);

  // 6) 상태 표시.
  stats.set("입력 texture", `${WIDTH}x${HEIGHT} rgba8unorm`);
  stats.set("texture usage", "TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT");
  stats.set("uniform buffer", `${paramBuffer.size} bytes`);
  stats.set("buffer usage", "UNIFORM | COPY_DST");
  stats.set("colorIntensity", `${params[0]} (10장에서 셰이더가 사용)`);
  stats.set("판정", "✅ 이미지가 GPU texture 를 거쳐 오른쪽에 표시됨");

  // 래퍼 버전은 raw 와 동치임을 보여주려고 만들기만 했다. 참조해 미사용 경고를 피한다.
  void inputTexViaHelper;
  void paramBufferViaHelper;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
