// 실습: 아래 TODO 를 채워, 비디오 처리를 requestVideoFrameCallback(rVFC)으로 돌리세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름: <video> 새 프레임마다 → frameTex 에 복사 → compute(필터) → blit(canvas)
//       + 재생/일시정지/seek 처리 + GPU 가 늦으면 프레임 스킵
//
// 핵심 원칙:
//  - 텍스처·파이프라인·bind group 은 setup 에서 "한 번"만 만든다 (매 프레임 새 객체 금지).
//  - rVFC 콜백은 매번 video.requestVideoFrameCallback(loop) 로 "재등록" 해야 다음 프레임이 온다.
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

const FRAME_BUDGET_MS = 1000 / 60;
const VIDEO_SRC = "/videos/sample.mp4"; // 개발 서버가 public/videos/ 를 서빙

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const playBtn = document.getElementById("play") as HTMLButtonElement;
  const pauseBtn = document.getElementById("pause") as HTMLButtonElement;
  const seek = document.getElementById("seek") as HTMLInputElement;

  // 영상 소스 지정 (제공됨)
  video.src = VIDEO_SRC;

  // 비디오 해상도는 metadata 로드 후 실제 크기를 쓴다 (하드코딩 금지). (제공됨)
  await new Promise<void>((resolve) => {
    if (video.readyState >= 1) resolve();
    else video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });
  const WIDTH = video.videoWidth;
  const HEIGHT = video.videoHeight;

  // WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 1) TODO: setup 에서 "한 번"만 만드세요.
  //    - frameTex = createFrameTexture(device, WIDTH, HEIGHT)   ← 매 프레임 여기에 복사
  //    - outputTex = createStorageTexture(device, WIDTH, HEIGHT)
  //    - pipeline = createComputePipeline(device, filterShader)
  //    - bindGroup: binding 0 = frameTex.createView(), binding 1 = outputTex.createView()
  //    - blitter = new Blitter(device, format)
  //    - const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);

  // 2) 매 프레임 재사용할 상태(콜백 안에서 새 객체를 만들지 않으려고 바깥에 둔다).
  let processing = false; // GPU 처리 중인가? → 그동안 온 프레임은 스킵
  let skipped = 0;

  // 3) TODO: 현재 frameTex 를 한 번 처리해 화면에 그리는 함수를 완성하세요.
  //    async function processCurrentFrame(mediaTime: number) {
  //      processing = true;
  //      const gpuMs = await measureGpuMs(device, () => {
  //        copyVideoFrameToTexture(device, video, frameTex, WIDTH, HEIGHT);
  //        // compute pass 인코딩 + dispatch(gx, gy) + submit
  //      });
  //      blitter.blit(context, outputTex);
  //      processing = false;
  //      stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
  //      // 예산(FRAME_BUDGET_MS) 초과 여부도 stats 에 표시
  //    }

  // 4) TODO: rVFC 루프를 완성하세요.
  //    function loop(now, metadata) {
  //      if (processing) { skipped++; stats.set("스킵", String(skipped)); }
  //      else { void processCurrentFrame(metadata.mediaTime); }
  //      // ★ 다음 프레임을 받으려면 매번 재등록!
  //      video.requestVideoFrameCallback(loop);
  //    }

  // 5) TODO: 재생/일시정지 버튼.
  //    playBtn → video.play() ,  pauseBtn → video.pause()
  //    (pause 하면 새 프레임이 없어 콜백이 자연히 멈춘다)

  // 6) TODO: seek.
  //    seek "input" → video.currentTime = (Number(seek.value)/1000) * video.duration
  //    video "seeked" → 일시정지 상태면 한 프레임만 processCurrentFrame 으로 갱신

  // 7) TODO: 메타데이터 로드 후 video.requestVideoFrameCallback(loop) 로 루프 시작.
  //    그리고 video.play() 시도(muted 라 보통 허용).

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createFrameTexture; void copyVideoFrameToTexture; void createStorageTexture;
  void createComputePipeline; void dispatchSizeFor; void Blitter; void measureGpuMs;
  void filterShader; void FRAME_BUDGET_MS; void playBtn; void pauseBtn; void seek;
  void context; void format; void processing; void skipped;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
