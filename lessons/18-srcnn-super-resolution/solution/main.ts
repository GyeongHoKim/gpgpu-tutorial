// 18장 정답 코드. 학습된 SRCNN 을 GPU 에서 추론한다.
//
// 흐름:
//   작은 LR 입력(128×128)
//     -> bilinear 2x upscale -> HR 텍스처(256×256)           (학습과 일치시키는 사전 확대)
//     -> rgbToFeatures        -> feat0  (3채널 @256×256)
//     -> runConv(conv1)       -> feat1  (16채널, 9x9, ReLU)
//     -> runConv(conv2)       -> feat2  (16채널, 1x1, ReLU)
//     -> runConv(conv3)       -> feat3  (3채널, 5x5, activation 없음)
//     -> featuresToRgb(3채널)  -> 출력 텍스처(256×256) -> blit
//
// conv 는 직접 구현하지 않는다. src/core/cnn.ts 의 CnnRunner / uploadConvLayer /
// createFeatureBuffer 를 그대로 쓴다. weight 는 이미 생성된 학습 결과를 import 한다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
  readTextureRGBA,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import { maxAbsDiff } from "@math/color.ts";
import {
  CnnRunner,
  uploadConvLayer,
  createFeatureBuffer,
  type GpuConvLayer,
} from "@core/cnn.ts";
import { srcnn } from "../model/srcnn-weights.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const LR_W = 128; // 저해상도(low-resolution) 입력 크기
const LR_H = 128;
const SCALE = 2;
const HR_W = LR_W * SCALE; // 256 — SRCNN 이 실제로 처리하는 해상도
const HR_H = LR_H * SCALE; // 256

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) HR 원본(256×256)을 코드로 만든 뒤, 일부러 LR(128×128)로 줄여 입력을 만든다.
  //    (실제 SR 상황을 흉내: 진짜 고해상도는 "정답"으로만 쓰고, 우리는 작은 입력만 받는다.)
  const hrCanvas = makeTestImageCanvas(HR_W, HR_H);
  const lrCanvas = document.createElement("canvas");
  lrCanvas.width = LR_W;
  lrCanvas.height = LR_H;
  // drawImage 로 256 -> 128 다운스케일.
  lrCanvas.getContext("2d")!.drawImage(hrCanvas, 0, 0, LR_W, LR_H);

  // 입력 LR 을 화면에 표시 (CSS 로 256 크기까지 늘려 보여 줌 — index.html 참고).
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(lrCanvas, 0, 0);

  // 2) WebGPU 초기화. 두 결과(bilinear / SRCNN)를 나란히 그릴 캔버스 2개.
  const { device } = await initWebGPU();
  const biCanvas = document.getElementById("bilinear") as HTMLCanvasElement;
  const srCanvas = document.getElementById("srcnn") as HTMLCanvasElement;
  const bi = configureCanvas(device, biCanvas);
  const sr = configureCanvas(device, srCanvas);

  // 3) 입력 텍스처(작게) + bilinear 확대 결과를 담을 HR 텍스처(2배 크게).
  const lrTex = createTextureFromSource(device, lrCanvas, { width: LR_W, height: LR_H });
  // HR 텍스처는 (a) bilinear compute 가 써넣고(STORAGE), (b) rgbToFeatures 가 읽고(TEXTURE),
  // (c) 화면에 blit(TEXTURE) 하므로 storage 텍스처로 만든다(세 usage 모두 켜짐).
  const hrTex = createStorageTexture(device, HR_W, HR_H);
  const srOutTex = createStorageTexture(device, HR_W, HR_H);

  // 4) bilinear upscale pipeline (14장과 동일).
  const bilinearPipeline = createComputePipeline(device, bilinearShader);
  const bilinearBind = device.createBindGroup({
    layout: bilinearPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: lrTex.createView() },
      { binding: 1, resource: hrTex.createView() },
    ],
  });
  const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);

  // 5) SRCNN 셋업 (한 번만). 각 conv layer 를 GPU 로 올리고, feature buffer 들을 만든다.
  //    모든 layer 가 HR 해상도(256×256)에서 same-padding 으로 동작한다.
  const runner = new CnnRunner(device);
  const layers: GpuConvLayer[] = srcnn.layers.map((layer) =>
    uploadConvLayer(device, layer, HR_W, HR_H),
  );
  const [conv1, conv2, conv3] = layers;

  // feature buffer: 3ch(입력) -> 16ch -> 16ch -> 3ch(출력). 모두 256×256.
  const feat0 = createFeatureBuffer(device, HR_W, HR_H, 3); // rgbToFeatures 결과
  const feat1 = createFeatureBuffer(device, HR_W, HR_H, conv1.outC); // 16
  const feat2 = createFeatureBuffer(device, HR_W, HR_H, conv2.outC); // 16
  const feat3 = createFeatureBuffer(device, HR_W, HR_H, conv3.outC); // 3

  const blitter = new Blitter(device, bi.format);

  // 6) bilinear 확대 한 번 실행 (HR 텍스처를 채운다). 시간도 잰다.
  const biMs = await measureGpuMs(device, () => {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(bilinearPipeline);
    pass.setBindGroup(0, bilinearBind);
    pass.dispatchWorkgroups(bgx, bgy);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
  blitter.blit(bi.context, hrTex); // 왼쪽: bilinear 확대 결과

  // 7) SRCNN 추론. 한 command encoder 에 conv 3장을 묶어 한 번에 제출하고 시간을 잰다.
  const srMs = await measureGpuMs(device, () => {
    const encoder = device.createCommandEncoder();
    // HR 텍스처(bilinear 확대 입력) -> 3채널 feature buffer
    runner.rgbToFeatures(encoder, hrTex, feat0, HR_W, HR_H);
    // conv1: 3 -> 16 (9x9, ReLU)
    runner.runConv(encoder, conv1, feat0, feat1);
    // conv2: 16 -> 16 (1x1, ReLU)
    runner.runConv(encoder, conv2, feat1, feat2);
    // conv3: 16 -> 3 (5x5, activation 없음). 최종 RGB.
    runner.runConv(encoder, conv3, feat2, feat3);
    // 3채널 feature -> RGBA 출력 텍스처 (channels=3, 앞 3채널을 RGB 로).
    //   featuresToRgb 가 출력 텍스처에 쓸 때 [0,1] 로 clamp 된다(unorm 텍스처).
    runner.featuresToRgb(encoder, feat3, srOutTex, HR_W, HR_H, 3);
    device.queue.submit([encoder.finish()]);
  });
  blitter.blit(sr.context, srOutTex); // 오른쪽: SRCNN 결과

  // 8) 숫자 비교: 진짜 HR 원본 대비 차이. SRCNN 이 bilinear 보다 원본에 가까우면(더 작은 diff)
  //    "디테일을 더 복원했다"는 증거다.
  const hrPixels = hrCanvas.getContext("2d")!.getImageData(0, 0, HR_W, HR_H).data;
  const hrRef = new Uint8Array(hrPixels.buffer.slice(0));
  const biPixels = await readTextureRGBA(device, hrTex, HR_W, HR_H);
  const srPixels = await readTextureRGBA(device, srOutTex, HR_W, HR_H);
  const biDiff = maxAbsDiff(hrRef, biPixels);
  const srDiff = maxAbsDiff(hrRef, srPixels);

  stats.set("입력(LR) → 출력(HR)", `${LR_W}×${LR_H} → ${HR_W}×${HR_H}`);
  stats.set("bilinear 시간", `${biMs.toFixed(2)} ms`);
  stats.set("SRCNN 추론 시간", `${srMs.toFixed(2)} ms (conv 3장)`);
  stats.set("bilinear vs 원본 HR 최대차", `${biDiff} / 255`);
  stats.set("SRCNN vs 원본 HR 최대차", `${srDiff} / 255`);
  stats.set(
    "판정",
    srDiff <= biDiff ? "✅ SRCNN 이 원본에 더 가까움 (디테일 복원)" : "ℹ️ 입력에 따라 다름",
  );
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
