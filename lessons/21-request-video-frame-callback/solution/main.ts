// 21장 정답 코드.
// 20장의 "비디오 프레임 → GPU 필터 → canvas" 를 requestVideoFrameCallback(rVFC)으로
// 옮겨, 새 비디오 프레임마다 정확히 한 번씩 처리한다.
//
// 핵심 원칙:
//  - setup 에서 텍스처·파이프라인·bind group 을 "한 번"만 만든다 (매 프레임 새 객체 금지).
//  - rVFC 콜백은 매번 video.requestVideoFrameCallback(loop) 로 "재등록" 해야 다음 프레임이 온다.
//  - pause 하면 새 프레임이 없으니 콜백이 자연히 멈춘다.
//  - seek 는 seeked 이벤트에서 한 프레임만 갱신한다.
//  - GPU 가 프레임 예산보다 늦으면, 처리 중인 동안 도착한 프레임은 건너뛴다(스킵).
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createFrameTexture, copyVideoFrameToTexture } from "@core/video-frame.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import filterShader from "../shaders/filter.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

// 60fps 기준 한 프레임 예산(ms). GPU 처리가 이를 넘으면 "늦다"고 본다.
const FRAME_BUDGET_MS = 1000 / 60;

// 샘플 영상. 개발 서버가 public/videos/ 를 /videos/ 로 서빙한다.
const VIDEO_SRC = "/videos/sample.mp4";

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const playBtn = document.getElementById("play") as HTMLButtonElement;
  const pauseBtn = document.getElementById("pause") as HTMLButtonElement;
  const seek = document.getElementById("seek") as HTMLInputElement;

  // 영상 소스를 런타임에 지정(번들러가 빌드 자산으로 해석하지 않게 HTML 이 아닌 여기서).
  video.src = VIDEO_SRC;

  // 비디오 해상도는 하드코딩하지 말고 metadata 로드 후 실제 크기(videoWidth/Height)를 쓴다.
  await new Promise<void>((resolve) => {
    if (video.readyState >= 1) resolve();
    else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });
  const WIDTH = video.videoWidth;
  const HEIGHT = video.videoHeight;

  // rVFC 미지원 브라우저(예: 일부 Firefox) 폴백 안내.
  const hasRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
  if (!hasRVFC) {
    stats.set(
      "rVFC",
      "미지원 → rAF 폴백(프레임 정렬 부정확). 최신 Chrome/Edge 권장",
    );
  }

  // 1) WebGPU 초기화.
  const { device } = await initWebGPU();
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 2) 텍스처·파이프라인·bind group 은 setup 에서 "한 번"만 만든다.
  //    매 프레임 새로 만들면 GC·할당으로 영상이 끊긴다(20장에서 배운 원칙).
  const frameTex = createFrameTexture(device, WIDTH, HEIGHT); // 매 프레임 여기에 현재 프레임만 복사
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);
  const pipeline = createComputePipeline(device, filterShader);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: frameTex.createView() },
      { binding: 1, resource: outputTex.createView() },
    ],
  });
  const blitter = new Blitter(device, format);
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);

  // 3) 매 프레임 재사용할 상태. 콜백 안에서 새 객체를 만들지 않으려고 바깥에 둔다.
  let processing = false; // GPU 가 아직 처리 중인가? → 그동안 온 프레임은 스킵
  let skipped = 0; // 스킵한 프레임 수
  let lastPresented = 0; // 직전 presentedFrames (드랍 감지용)
  let fpsCount = 0;
  let fpsSince = performance.now();

  // 현재 frameTex 의 내용을 한 번 처리해 화면에 그린다.
  // GPU 시간을 재고 stats 를 갱신한다. (재생 루프와 seek 양쪽에서 호출)
  async function processCurrentFrame(mediaTime: number) {
    processing = true;
    const gpuMs = await measureGpuMs(device, () => {
      // (a) 현재 비디오 프레임을 텍스처로 복사.
      copyVideoFrameToTexture(device, video, frameTex, WIDTH, HEIGHT);
      // (b) compute pass: 프레임에 필터 적용.
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(gx, gy);
      pass.end();
      device.queue.submit([encoder.finish()]);
    });
    // (c) 결과를 화면에 그린다.
    blitter.blit(context, outputTex);
    processing = false;

    stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
    stats.set("mediaTime", `${mediaTime.toFixed(3)} s`);
    if (gpuMs > FRAME_BUDGET_MS) {
      stats.set("예산", `초과 (> ${FRAME_BUDGET_MS.toFixed(1)} ms)`);
    } else {
      stats.set("예산", `OK (≤ ${FRAME_BUDGET_MS.toFixed(1)} ms)`);
    }
  }

  // 4) rVFC 루프. 새 비디오 프레임마다 호출된다.
  //    metadata.mediaTime = 이 프레임이 가리키는 영상 시각(초).
  //    metadata.presentedFrames = 지금까지 표시된 프레임 수(연속이 아니면 브라우저가 드랍한 것).
  function loop(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) {
    // 우리 쪽 스킵 전략: 이전 프레임 GPU 처리가 아직 안 끝났으면(밀렸으면)
    // 이번 프레임은 처리하지 않고 건너뛴다. 그래야 큐가 무한정 쌓이지 않는다.
    if (processing) {
      skipped++;
      stats.set("스킵(우리)", String(skipped));
    } else {
      void processCurrentFrame(metadata.mediaTime);
    }

    // 브라우저가 드랍한 프레임 감지: presentedFrames 가 1보다 많이 뛰면 그 사이가 드랍된 것.
    if (lastPresented !== 0 && metadata.presentedFrames - lastPresented > 1) {
      stats.set(
        "브라우저 드랍",
        `presentedFrames +${metadata.presentedFrames - lastPresented}`,
      );
    }
    lastPresented = metadata.presentedFrames;

    // 표시 FPS(rVFC 콜백 빈도) 측정.
    fpsCount++;
    const elapsed = performance.now() - fpsSince;
    if (elapsed >= 500) {
      stats.set("FPS", (fpsCount / (elapsed / 1000)).toFixed(1));
      fpsCount = 0;
      fpsSince = performance.now();
    }

    // ★ 핵심: 다음 프레임을 받으려면 매번 "재등록" 해야 한다. 한 번 등록으로 반복되지 않는다.
    video.requestVideoFrameCallback(loop);
  }

  // rAF 폴백: rVFC 가 없으면 requestAnimationFrame 으로 대체한다.
  // 단, rAF 는 "디스플레이 갱신"마다라 비디오 프레임과 1:1 로 정렬되지 않는다(중복/누락 가능).
  function rafLoop() {
    if (!processing) void processCurrentFrame(video.currentTime);
    else skipped++;
    requestAnimationFrame(rafLoop);
  }

  function startLoop() {
    if (hasRVFC) video.requestVideoFrameCallback(loop);
    else requestAnimationFrame(rafLoop);
  }

  // 5) 재생 / 일시정지.
  //    play() 하면 새 프레임이 흐르며 rVFC 콜백이 다시 불린다.
  //    pause() 하면 새 프레임이 없어 콜백이 자연히 멈춘다(별도 cancel 불필요).
  playBtn.addEventListener("click", () => {
    video.play();
  });
  pauseBtn.addEventListener("click", () => {
    video.pause();
  });

  // 6) seek. range 값(0~1000)을 영상 길이에 매핑해 currentTime 을 바꾼다.
  //    seek 중에는 프레임이 흐르지 않으므로, seeked 이벤트에서 "한 프레임만" 갱신한다.
  seek.addEventListener("input", () => {
    if (!Number.isFinite(video.duration)) return;
    const t = (Number(seek.value) / 1000) * video.duration;
    video.currentTime = t;
  });
  video.addEventListener("seeked", () => {
    // 일시정지 상태에서 seek 하면 rVFC 콜백이 안 불릴 수 있으니, 여기서 직접 한 프레임 처리.
    if (video.paused && !processing) void processCurrentFrame(video.currentTime);
  });

  // 재생 위치에 따라 seek 슬라이더를 따라가게 한다(콜백 안에서 매번 만들지 않게 핸들러 분리).
  video.addEventListener("timeupdate", () => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
    }
  });

  // 7) 메타데이터가 로드되면 루프를 시작하고, 첫 프레임을 한 장 그려둔다.
  if (video.readyState >= 2) {
    startLoop();
  } else {
    video.addEventListener("loadeddata", () => startLoop(), { once: true });
  }

  // 자동재생 시도(muted 라 정책상 허용). 막히면 사용자가 "재생" 버튼을 누르면 된다.
  video.play().catch(() => {
    stats.set("상태", "자동재생 차단됨 → '재생' 버튼을 누르세요");
  });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
