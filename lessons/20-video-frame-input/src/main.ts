// 실습: 아래 TODO 를 채워 <video> 프레임을 GPU 로 grayscale 처리하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 핵심 교육 포인트:
//  - 텍스처/파이프라인/Blitter 같은 무거운 객체는 setup 에서 **한 번만** 만든다.
//  - 매 프레임에는 copyVideoFrameToTexture 로 텍스처 "내용만" 갱신해 재사용한다.
//  - copyExternalImageToTexture 는 <video> 를 소스로 직접 받는다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { createFrameTexture, copyVideoFrameToTexture } from "@core/video-frame.ts";
import grayscaleShader from "../shaders/grayscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 320;
const HEIGHT = 240;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;
  const toggleBtn = document.getElementById("toggle") as HTMLButtonElement;

  // 0) 비디오 소스 지정 (제공됨) — HTML 의 data-src 를 실제 src 로 옮긴다.
  video.src = video.dataset.src ?? "/videos/sample.mp4";

  // 1) WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 비디오 첫 프레임 대기 (제공됨) — loadeddata 전에는 복사할 픽셀이 없다.
  await waitForVideoReady(video);

  // 3) TODO [setup — 루프 밖에서 한 번만]: 무거운 객체를 만드세요.
  //    - 입력 텍스처:  createFrameTexture(device, WIDTH, HEIGHT)
  //    - 출력 텍스처:  createStorageTexture(device, WIDTH, HEIGHT)
  //    - pipeline:    createComputePipeline(device, grayscaleShader)
  //    - bind group:  binding 0 = 입력 텍스처 view, binding 1 = 출력 텍스처 view
  //    - blitter:     new Blitter(device, format)
  //    - dispatch 크기: const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);
  //    이 객체들을 절대 frame() 안에서 만들지 마세요 (매 프레임 새로 만들면 성능이 무너집니다).

  // 필터 on/off 토글 (제공됨)
  let filterOn = true;
  toggleBtn.addEventListener("click", () => {
    filterOn = !filterOn;
    toggleBtn.textContent = filterOn ? "필터: 켜짐 (grayscale)" : "필터: 꺼짐 (원본)";
  });

  let lastTime = performance.now();
  let fps = 0;

  // 4) TODO [루프 — 매 프레임]: frame() 을 완성하고 requestAnimationFrame 으로 반복하세요.
  function frame() {
    // (a) TODO: copyVideoFrameToTexture(device, video, inputTex, WIDTH, HEIGHT) 로
    //     현재 프레임을 입력 텍스처에 복사 (텍스처는 위에서 만든 것을 재사용).

    // (b) TODO: filterOn 이면 grayscale compute pass 를 dispatch 하고
    //     blitter.blit(context, outputTex) 로 결과를 그리세요.
    //     filterOn 이 아니면 blitter.blit(context, inputTex) 로 원본을 그리세요.

    // (c) FPS 표시 (제공됨)
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;
    stats.set("FPS", fps.toFixed(0));
    stats.set("프레임 크기", `${WIDTH}×${HEIGHT}`);
    stats.set("필터", filterOn ? "grayscale" : "원본 (off)");

    // (d) TODO: requestAnimationFrame(frame) 으로 다음 프레임 예약 (루프).
  }
  requestAnimationFrame(frame);

  // 사용하지 않는 import 경고를 피하려 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createFrameTexture; void copyVideoFrameToTexture; void createStorageTexture;
  void createComputePipeline; void dispatchSizeFor; void Blitter;
}

/** loadeddata(첫 프레임 준비) 까지 기다린다. 이미 준비됐으면 바로 반환. (제공됨) */
function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
  });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
