// 22장 실습 골격. TODO 를 채워 실시간 SR 플레이어를 완성하세요.
//
// 핵심: "18·19장의 SR 추론을, 21장의 비디오 프레임 루프(rVFC) 안에서 매 프레임 반복한다."
// conv·deconv·확대·blit·프레임 복사는 직접 구현하지 않습니다 — src/core 의 엔진을 그대로 씁니다.
//
// 가장 중요한 규칙: **매 프레임 새 객체(layer/buffer/pipeline/bind group) 금지.**
// 전부 setup 에서 한 번만 만들고, 루프 안에서는 command encoder 만 새로 만들어 재사용하세요.
//
// 막히면 solution/main.ts 와 비교하세요.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createStorageTexture } from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import { createFrameTexture, copyVideoFrameToTexture } from "@core/video-frame.ts";
import {
  CnnRunner,
  uploadConvLayer,
  uploadDeconvLayer,
  createFeatureBuffer,
  type GpuConvLayer,
  type GpuDeconvLayer,
} from "@core/cnn.ts";
// 학습된 weight 는 18·19장 폴더에서 import 만 합니다(수정 금지).
import { srcnn } from "../../18-srcnn-super-resolution/model/srcnn-weights.ts";
import { fsrcnn } from "../../19-fsrcnn-super-resolution/model/fsrcnn-weights.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const LR_W = 320;
const LR_H = 240;
const SCALE = 2;
const HR_W = LR_W * SCALE; // 640
const HR_H = LR_H * SCALE; // 480
const FRAME_BUDGET_MS = 16.7; // GPU 가 이보다 오래 걸리면 다음 프레임을 스킵

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;

  // 1) WebGPU 초기화 + 두 출력 캔버스(bilinear / SR) — 이미 되어 있습니다.
  const { device } = await initWebGPU();
  const bi = configureCanvas(device, document.getElementById("bilinear") as HTMLCanvasElement);
  const sr = configureCanvas(device, document.getElementById("sr") as HTMLCanvasElement);

  // 2) 비디오 소스 지정 + 첫 프레임 준비 대기 + 재생 — 이미 되어 있습니다.
  if (!video.src) video.src = "/videos/sample.mp4";
  if (video.readyState < 2) {
    await new Promise<void>((resolve) =>
      video.addEventListener("loadeddata", () => resolve(), { once: true }),
    );
  }
  await video.play().catch(() => {});

  // ─────────────────────────────────────────────────────────────────────────
  // 여기서부터 setup: 전부 "한 번만" 만듭니다. 루프 안에서 다시 만들지 마세요.
  // ─────────────────────────────────────────────────────────────────────────

  // TODO 1) 텍스처 (한 번만)
  //   - frameTex : createFrameTexture(device, LR_W, LR_H)        — 매 프레임 비디오를 복사받음
  //   - hrTex    : createStorageTexture(device, HR_W, HR_H)      — bilinear 확대 결과(왼쪽 + SRCNN 입력)
  //   - srOutTex : createStorageTexture(device, HR_W, HR_H)      — SR 최종 출력(오른쪽)

  // TODO 2) bilinear upscale pipeline + bind group (frameTex -> hrTex)
  //   - createComputePipeline(device, bilinearShader)
  //   - bind group: binding 0 = frameTex view, 1 = hrTex view
  //   - const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);   ← 출력(HR) 기준

  // TODO 3) SR 셋업 — SRCNN·FSRCNN 양쪽을 미리 다 올려 둡니다(전환은 선택일 뿐).
  //   const runner = new CnnRunner(device);
  //   --- SRCNN (전부 HR=640×480 해상도) ---
  //     srcnn.layers.map((l) => uploadConvLayer(device, l, HR_W, HR_H)) → [sConv1,sConv2,sConv3]
  //     feature buffer: sFeat0=3@HR, sFeat1=16@HR, sFeat2=16@HR, sFeat3=3@HR
  //   --- FSRCNN (conv 5장 = LR=320×240, deconv 만 HR) ---
  //     fsrcnn.layers.slice(0,5).map((l) => uploadConvLayer(device, l, LR_W, LR_H))
  //       → [fExtract,fShrink,fMap1,fMap2,fExpand]
  //     fDeconv = uploadDeconvLayer(device, fsrcnn.layers[5], LR_W, LR_H,
  //                 fsrcnn.deconv!.stride, fsrcnn.deconv!.padding, fsrcnn.deconv!.output_padding)
  //     feature buffer: fFeat0=3@LR, fFeat1=16@LR, fFeat2=8@LR, fFeat3=8@LR,
  //                     fFeat4=8@LR, fFeat5=16@LR, fFeat6=3@HR   ← fFeat6 만 HR!

  // TODO 4) const blitter = new Blitter(device, bi.format);

  // TODO 5) 추론 기록 함수들 — 각자 받은 encoder 에 pass 만 기록(submit 은 호출자가).
  //   recordBilinear(encoder): bilinear pass (frameTex -> hrTex)
  //   recordSrcnn(encoder):
  //     rgbToFeatures(encoder, hrTex, sFeat0, HR_W, HR_H)
  //     runConv ×3 (sConv1→sConv2→sConv3) → featuresToRgb(sFeat3, srOutTex, HR_W, HR_H, 3)
  //   recordFsrcnn(encoder):
  //     rgbToFeatures(encoder, frameTex, fFeat0, LR_W, LR_H)
  //     runConv ×5 → runDeconv(fDeconv, fFeat5, fFeat6) → featuresToRgb(fFeat6, srOutTex, HR_W, HR_H, 3)

  // TODO 6) 컨트롤 상태 + 이벤트
  //   let model: "srcnn" | "fsrcnn" = "srcnn";  let srOn = true;  let paused = false;
  //   #model(select) change → model 변경
  //   #srToggle(button) click → srOn 토글 + 라벨/aria-pressed 갱신
  //   #playPause(button) click → paused 토글, video.pause()/play();
  //       재생 재개 시 video.requestVideoFrameCallback(onFrame) 로 루프 다시 걸기

  // TODO 7) FPS / 스킵 상태 변수
  //   lastFpsTime, framesSinceFps, fps, skipNext=false, skippedCount=0

  // TODO 8) rVFC 루프 onFrame()  ← 여기 안에서 새 layer/buffer/pipeline 만들지 말 것!
  //   if (skipNext) { skipNext=false; skippedCount++; stats.set("스킵", ...);
  //                   if (!paused) video.requestVideoFrameCallback(onFrame); return; }
  //   (a) copyVideoFrameToTexture(device, video, frameTex, LR_W, LR_H)
  //   (b) const gpuMs = await measureGpuMs(device, () => {
  //         const encoder = device.createCommandEncoder();
  //         recordBilinear(encoder);
  //         if (srOn) { model==="srcnn" ? recordSrcnn(encoder) : recordFsrcnn(encoder); }
  //         device.queue.submit([encoder.finish()]);
  //       });
  //   (c) blitter.blit(bi.context, hrTex);
  //       blitter.blit(sr.context, srOn ? srOutTex : hrTex);
  //   (d) if (gpuMs > FRAME_BUDGET_MS) skipNext = true;   // 예산 초과 → 다음 프레임 스킵
  //   (e) FPS 계산 + stats.set("모델"/"FPS"/"GPU 시간"/...)
  //   (f) if (!paused) video.requestVideoFrameCallback(onFrame);

  // TODO 9) 첫 콜백 걸기: video.requestVideoFrameCallback(onFrame);

  // 임시: TODO 를 지우면 아래 줄도 지우세요(미사용 import 경고 방지용 no-op).
  void [
    initWebGPU, configureCanvas, createStorageTexture, createComputePipeline, dispatchSizeFor,
    Blitter, measureGpuMs, createFrameTexture, copyVideoFrameToTexture, CnnRunner,
    uploadConvLayer, uploadDeconvLayer, createFeatureBuffer, srcnn, fsrcnn, bilinearShader,
    bi, sr, video, stats, LR_W, LR_H, SCALE, HR_W, HR_H, FRAME_BUDGET_MS,
  ] as unknown as (GpuConvLayer | GpuDeconvLayer)[];
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
