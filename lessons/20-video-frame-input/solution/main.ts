// 20장 정답 코드. 13장의 정지 이미지 GPU grayscale 을 <video> 프레임으로 확장한다.
//
// 핵심: 무거운 객체(텍스처·pipeline·bind group·Blitter)는 setup 에서 **한 번만** 만들고,
//       매 프레임에는 copyVideoFrameToTexture 로 텍스처 "내용만" 갱신해 재사용한다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { createFrameTexture, copyVideoFrameToTexture } from "@core/video-frame.ts";
import grayscaleShader from "../shaders/grayscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

// 샘플 영상은 320x240. (video.videoWidth/Height 로도 읽을 수 있지만 여기선 고정값으로 단순화)
const WIDTH = 320;
const HEIGHT = 240;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;
  const toggleBtn = document.getElementById("toggle") as HTMLButtonElement;

  // 0) 비디오 소스 지정. (HTML 의 data-src 를 실제 src 로 옮긴다)
  //    muted + autoplay + playsinline 속성은 HTML 에 이미 있어 자동재생된다.
  video.src = video.dataset.src ?? "/videos/sample.mp4";

  // 1) WebGPU 초기화. (출력 canvas 에 webgpu context 를 붙인다)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 비디오가 첫 프레임을 가질 때까지 기다린다.
  //    loadeddata 전에는 video 에서 읽을 픽셀이 없어 복사가 실패한다.
  await waitForVideoReady(video);

  // 3) ── setup: 루프 "밖"에서 한 번만 만드는 무거운 객체들 ──
  //    매 프레임 새로 만들면 GPU 메모리가 터지고 프레임이 끊긴다. 만들고 재사용한다.
  const inputTex = createFrameTexture(device, WIDTH, HEIGHT); // 비디오 프레임을 받을 입력 텍스처
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT); // grayscale 결과를 쓸 출력 텍스처
  const pipeline = createComputePipeline(device, grayscaleShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTex.createView() },
      { binding: 1, resource: outputTex.createView() },
    ],
  });
  const blitter = new Blitter(device, format);
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);

  // 필터 on/off 토글.
  let filterOn = true;
  toggleBtn.addEventListener("click", () => {
    filterOn = !filterOn;
    toggleBtn.textContent = filterOn ? "필터: 켜짐 (grayscale)" : "필터: 꺼짐 (원본)";
  });

  // FPS 측정용 (rAF 콜백 사이 시간으로 대략 계산).
  let lastTime = performance.now();
  let fps = 0;

  // 4) ── 루프: 매 프레임 "내용만" 갱신 ──
  function frame() {
    // (a) 현재 비디오 프레임을 입력 텍스처로 복사한다. 텍스처는 새로 만들지 않고 재사용.
    //     copyExternalImageToTexture 는 <video> 를 소스로 직접 받는다.
    copyVideoFrameToTexture(device, video, inputTex, WIDTH, HEIGHT);

    const encoder = device.createCommandEncoder();

    if (filterOn) {
      // (b) compute 필터: 13장과 똑같은 grayscale compute pass.
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(gx, gy);
      pass.end();
      device.queue.submit([encoder.finish()]);
      // (c) 결과(출력 텍스처)를 canvas 에 그린다.
      blitter.blit(context, outputTex);
    } else {
      // 필터가 꺼지면 입력 프레임(원본)을 그대로 canvas 에 그린다.
      blitter.blit(context, inputTex);
    }

    // (d) FPS 갱신.
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1; // 약간 평활화
    stats.set("FPS", fps.toFixed(0));
    stats.set("프레임 크기", `${WIDTH}×${HEIGHT}`);
    stats.set("필터", filterOn ? "grayscale" : "원본 (off)");

    // (e) 다음 프레임 예약 — 이게 루프를 도는 핵심.
    //     정확한 비디오 프레임 동기화(requestVideoFrameCallback)는 21장에서 다룬다.
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** loadeddata(첫 프레임 준비) 까지 기다린다. 이미 준비됐으면 바로 반환. */
function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  // readyState >= 2 (HAVE_CURRENT_DATA) 면 현재 프레임 픽셀이 있다.
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
