// 22장 정답 코드. 메인 트랙 캡스톤.
//
// 한 줄 요약: "18·19장의 SR 추론을 21장의 비디오 프레임 루프 안에서 매 프레임 반복한다."
//
//   <video> ─(rVFC)─> copyVideoFrameToTexture(320×240)
//      ├─ SR OFF: bilinear 2x 확대만 (SR 안 함)
//      └─ SR ON:
//          ├─ SRCNN : bilinear 2x → rgbToFeatures → conv1/2/3 → featuresToRgb (640×480)
//          └─ FSRCNN: rgbToFeatures(320×240) → conv 5장 → deconv(→640×480) → featuresToRgb
//      → split-view 두 캔버스(bilinear vs SR)에 blit, GPU 시간·FPS 표시.
//
// 매 프레임 새 객체 금지: layer·feature buffer·pipeline·bind group 은 전부 setup 에서 한 번만
// 만든다. 루프 안에서는 만들어 둔 것을 재사용하고 command encoder 만 새로 만든다.
//
// conv·deconv·확대·blit·프레임 복사는 직접 구현하지 않는다. src/core 의 엔진을 그대로 쓴다.
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
// 학습된 weight 는 18·19장 폴더에서 import 만 한다(수정 금지).
import { srcnn } from "../../18-srcnn-super-resolution/model/srcnn-weights.ts";
import { fsrcnn } from "../../19-fsrcnn-super-resolution/model/fsrcnn-weights.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

// 비디오는 320×240, SR 출력은 2x 인 640×480.
const LR_W = 320; // 한 프레임의 저해상도 입력 크기 (sample.mp4)
const LR_H = 240;
const SCALE = 2;
const HR_W = LR_W * SCALE; // 640 — bilinear 확대 / SR 결과의 출력 해상도
const HR_H = LR_H * SCALE; // 480

// GPU 한 프레임 예산(ms). 이 시간보다 오래 걸리는 프레임이 누적되면 프레임을 스킵한다.
// 16.7ms ≈ 60fps. tiny 모델이라도 640×480 SRCNN 은 이 예산을 넘길 수 있다.
const FRAME_BUDGET_MS = 16.7;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const video = document.getElementById("video") as HTMLVideoElement;

  // 1) WebGPU 초기화. 두 결과(bilinear / SR)를 나란히 그릴 캔버스 2개.
  const { device } = await initWebGPU();
  const biCanvas = document.getElementById("bilinear") as HTMLCanvasElement;
  const srCanvas = document.getElementById("sr") as HTMLCanvasElement;
  const bi = configureCanvas(device, biCanvas);
  const sr = configureCanvas(device, srCanvas);

  // 2) 비디오 소스 지정(dev 서버가 /videos/sample.mp4 로 서빙) 후, 첫 프레임 디코딩까지 대기.
  //    (HTML 의 src 속성 대신 여기서 지정해 번들러가 정적 에셋으로 오해하지 않게 한다.)
  if (!video.src) video.src = "/videos/sample.mp4";
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
    });
  }
  await video.play().catch(() => {
    /* 일부 브라우저는 사용자 상호작용 전 play 거부 — 토글 버튼으로 재시도 가능. */
  });

  // 3) 텍스처 (전부 setup 에서 한 번만 — 매 프레임 새로 만들지 않는다).
  //    - frameTex: 매 프레임 현재 비디오 프레임을 복사해 받는 LR(320×240) 텍스처.
  //    - hrTex   : bilinear 2x 확대 결과(640×480). SRCNN 입력이자 화면 왼쪽 비교본.
  //    - srOutTex: SR 최종 출력(640×480). 화면 오른쪽.
  const frameTex = createFrameTexture(device, LR_W, LR_H);
  const hrTex = createStorageTexture(device, HR_W, HR_H);
  const srOutTex = createStorageTexture(device, HR_W, HR_H);

  // 4) bilinear upscale pipeline (14·18장과 동일). LR(frameTex) -> HR(hrTex).
  const bilinearPipeline = createComputePipeline(device, bilinearShader);
  const bilinearBind = device.createBindGroup({
    layout: bilinearPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: frameTex.createView() },
      { binding: 1, resource: hrTex.createView() },
    ],
  });
  const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);

  // 5) SR 셋업 (한 번만). SRCNN·FSRCNN 양쪽 layer·feature buffer 를 모두 미리 올려 둔다.
  //    모델 전환은 "어느 쪽 버퍼/레이어를 쓰느냐" 선택일 뿐, 매번 다시 만들지 않는다.
  const runner = new CnnRunner(device);

  // --- SRCNN: 모든 conv 가 HR(640×480) 해상도에서 same-padding (18장 그대로) ---
  const srcnnLayers: GpuConvLayer[] = srcnn.layers.map((layer) =>
    uploadConvLayer(device, layer, HR_W, HR_H),
  );
  const [sConv1, sConv2, sConv3] = srcnnLayers;
  const sFeat0 = createFeatureBuffer(device, HR_W, HR_H, 3); // rgbToFeatures(hrTex)
  const sFeat1 = createFeatureBuffer(device, HR_W, HR_H, sConv1.outC); // 16
  const sFeat2 = createFeatureBuffer(device, HR_W, HR_H, sConv2.outC); // 16
  const sFeat3 = createFeatureBuffer(device, HR_W, HR_H, sConv3.outC); // 3

  // --- FSRCNN: conv 5장은 LR(320×240), deconv 만 640×480 으로 확대 (19장 그대로) ---
  const fsrcnnConv: GpuConvLayer[] = fsrcnn.layers
    .slice(0, 5)
    .map((layer) => uploadConvLayer(device, layer, LR_W, LR_H));
  const [fExtract, fShrink, fMap1, fMap2, fExpand] = fsrcnnConv;
  const fDeconv: GpuDeconvLayer = uploadDeconvLayer(
    device,
    fsrcnn.layers[5],
    LR_W,
    LR_H,
    fsrcnn.deconv!.stride,
    fsrcnn.deconv!.padding,
    fsrcnn.deconv!.output_padding,
  );
  const fFeat0 = createFeatureBuffer(device, LR_W, LR_H, 3); // rgbToFeatures(frameTex)
  const fFeat1 = createFeatureBuffer(device, LR_W, LR_H, fExtract.outC); // 16
  const fFeat2 = createFeatureBuffer(device, LR_W, LR_H, fShrink.outC); // 8
  const fFeat3 = createFeatureBuffer(device, LR_W, LR_H, fMap1.outC); // 8
  const fFeat4 = createFeatureBuffer(device, LR_W, LR_H, fMap2.outC); // 8
  const fFeat5 = createFeatureBuffer(device, LR_W, LR_H, fExpand.outC); // 16
  const fFeat6 = createFeatureBuffer(device, HR_W, HR_H, fDeconv.outC); // 3 @ 640×480

  const blitter = new Blitter(device, bi.format);

  // 6) 추론 함수들. 각 함수는 받은 encoder 에 pass 를 "기록"만 한다(submit 은 호출자가).
  //    매 프레임 호출되지만, 안에서 새로 만드는 큰 객체는 없다(엔진 내부 bind group 정도).

  /** bilinear 2x 확대: frameTex -> hrTex. 매 프레임 항상 실행(왼쪽 비교본 + SRCNN 입력). */
  function recordBilinear(encoder: GPUCommandEncoder): void {
    const pass = encoder.beginComputePass();
    pass.setPipeline(bilinearPipeline);
    pass.setBindGroup(0, bilinearBind);
    pass.dispatchWorkgroups(bgx, bgy);
    pass.end();
  }

  /** SRCNN: 먼저 확대된 hrTex 를 받아 conv 3장 -> srOutTex (640×480 에서 처리). */
  function recordSrcnn(encoder: GPUCommandEncoder): void {
    runner.rgbToFeatures(encoder, hrTex, sFeat0, HR_W, HR_H);
    runner.runConv(encoder, sConv1, sFeat0, sFeat1); // 3 -> 16 (9x9, ReLU)
    runner.runConv(encoder, sConv2, sFeat1, sFeat2); // 16 -> 16 (1x1, ReLU)
    runner.runConv(encoder, sConv3, sFeat2, sFeat3); // 16 -> 3 (5x5)
    runner.featuresToRgb(encoder, sFeat3, srOutTex, HR_W, HR_H, 3);
  }

  /** FSRCNN: LR(frameTex) 에서 conv 5장 -> deconv 로 확대 -> srOutTex. */
  function recordFsrcnn(encoder: GPUCommandEncoder): void {
    runner.rgbToFeatures(encoder, frameTex, fFeat0, LR_W, LR_H); // 320×240
    runner.runConv(encoder, fExtract, fFeat0, fFeat1); // 3 -> 16 (5x5, ReLU)
    runner.runConv(encoder, fShrink, fFeat1, fFeat2); // 16 -> 8 (1x1)
    runner.runConv(encoder, fMap1, fFeat2, fFeat3); // 8 -> 8 (3x3, ReLU)
    runner.runConv(encoder, fMap2, fFeat3, fFeat4); // 8 -> 8 (3x3, ReLU)
    runner.runConv(encoder, fExpand, fFeat4, fFeat5); // 8 -> 16 (1x1)
    runner.runDeconv(encoder, fDeconv, fFeat5, fFeat6); // 16 -> 3, 320→640 확대
    runner.featuresToRgb(encoder, fFeat6, srOutTex, HR_W, HR_H, 3);
  }

  // 7) 컨트롤 상태 (UI). 모델 전환·SR on/off·재생/일시정지는 전부 plain 변수 토글.
  let model: "srcnn" | "fsrcnn" = "srcnn";
  let srOn = true;
  let paused = false;

  const modelSel = document.getElementById("model") as HTMLSelectElement;
  const srBtn = document.getElementById("srToggle") as HTMLButtonElement;
  const playBtn = document.getElementById("playPause") as HTMLButtonElement;

  modelSel.addEventListener("change", () => {
    model = modelSel.value === "fsrcnn" ? "fsrcnn" : "srcnn";
  });
  srBtn.addEventListener("click", () => {
    srOn = !srOn;
    srBtn.textContent = srOn ? "SR: ON" : "SR: OFF";
    srBtn.setAttribute("aria-pressed", String(srOn));
  });
  playBtn.addEventListener("click", () => {
    paused = !paused;
    if (paused) {
      video.pause();
      playBtn.textContent = "▶ 재생";
    } else {
      video.play().catch(() => {});
      playBtn.textContent = "⏸ 일시정지";
      // 재생 재개 시 rVFC 를 다시 건다(일시정지 동안 콜백이 안 오므로).
      video.requestVideoFrameCallback(onFrame);
    }
  });

  // 8) FPS / 스킵 상태. (21장 패턴: GPU 가 아직 처리 중이면 그동안 온 프레임은 스킵)
  let processing = false; // 직전 프레임의 GPU 작업이 아직 안 끝났는가?
  let skippedCount = 0; // GPU 가 밀려 건너뛴 프레임 수
  let lastFpsTime = performance.now();
  let framesSinceFps = 0;
  let fps = 0;

  // 현재 frameTex 를 한 번 추론해 두 캔버스에 그린다. GPU 시간을 재고 stats 를 갱신한다.
  async function processCurrentFrame(): Promise<void> {
    processing = true;
    // GPU 작업을 한 encoder 에 기록하고 한 번에 제출 + GPU 시간 측정.
    const gpuMs = await measureGpuMs(device, () => {
      const encoder = device.createCommandEncoder();
      // 현재 비디오 프레임을 LR 텍스처로 복사(텍스처는 재사용, 내용만 갱신).
      copyVideoFrameToTexture(device, video, frameTex, LR_W, LR_H);
      // bilinear 확대는 항상(왼쪽 비교본; SRCNN 이면 입력으로도 쓰임).
      recordBilinear(encoder);
      if (srOn) {
        if (model === "srcnn") recordSrcnn(encoder);
        else recordFsrcnn(encoder);
      }
      device.queue.submit([encoder.finish()]);
    });

    // 결과를 두 캔버스에 그린다. 왼쪽은 항상 bilinear.
    // 오른쪽은 SR ON 이면 SR 결과, OFF 면 bilinear(= SR 안 한 비교).
    blitter.blit(bi.context, hrTex);
    blitter.blit(sr.context, srOn ? srOutTex : hrTex);
    processing = false;

    stats.set("모델", srOn ? model.toUpperCase() : "OFF (bilinear 만)");
    stats.set("입력 → 출력", `${LR_W}×${LR_H} → ${HR_W}×${HR_H}`);
    stats.set(
      "GPU 시간",
      `${gpuMs.toFixed(2)} ms / 예산 ${FRAME_BUDGET_MS.toFixed(1)} ms` +
        (gpuMs > FRAME_BUDGET_MS ? " ⚠ 초과" : ""),
    );
  }

  // 9) rVFC 루프 — 새 비디오 프레임마다 호출된다.
  //    여기 안에서는 절대 새 layer/buffer/pipeline 을 만들지 않는다(만들어 둔 것만 사용).
  function onFrame(): void {
    // 스킵 전략: 직전 프레임의 GPU 가 아직 처리 중이면(예산 초과로 밀렸으면) 이번 프레임은
    // 건너뛴다. 그래야 GPU 큐가 무한정 쌓이지 않고 영상이 일정하게 흐른다.
    if (processing) {
      skippedCount++;
      stats.set("스킵", `누적 ${skippedCount} 프레임 (GPU 가 밀려 건너뜀)`);
    } else {
      void processCurrentFrame();
    }

    // 표시 FPS(rVFC 콜백 빈도) 측정.
    framesSinceFps++;
    const now = performance.now();
    if (now - lastFpsTime >= 500) {
      fps = (framesSinceFps * 1000) / (now - lastFpsTime);
      framesSinceFps = 0;
      lastFpsTime = now;
      stats.set("FPS", fps.toFixed(1));
    }

    // ★ 핵심: 다음 프레임을 받으려면 매번 재등록 해야 한다. 일시정지 중엔 멈춘다(재생 버튼이 다시 건다).
    if (!paused) video.requestVideoFrameCallback(onFrame);
  }

  // 10) 첫 프레임 콜백을 건다. 이후는 onFrame 이 스스로 다음 프레임을 예약한다.
  video.requestVideoFrameCallback(onFrame);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
