// 19장 정답 코드. 학습된 FSRCNN 을 GPU 에서 추론한다.
//
// SRCNN(18장)과 핵심 차이:
//   SRCNN  = 먼저 bilinear 로 HR(256) 로 확대 → conv 3장을 HR 해상도에서.
//   FSRCNN = LR(128) 해상도에서 conv 5장을 다 끝낸 뒤, 마지막 deconvolution 으로 2x 확대(256).
// 즉 무거운 conv 연산을 작은 LR 격자에서 처리하므로 빠르고, "확대" 자체도 고정 방식(bilinear)이
// 아니라 학습된 가중치(deconv)로 한다.
//
// 흐름:
//   LR 입력(128×128 RGB)
//     -> rgbToFeatures        -> feat0  (3채널 @128×128)
//     -> runConv(extract)     -> feat1  (16채널, 5x5, ReLU)
//     -> runConv(shrink)      -> feat2  (8채널, 1x1, activation 없음)
//     -> runConv(map1)        -> feat3  (8채널, 3x3, ReLU)
//     -> runConv(map2)        -> feat4  (8채널, 3x3, ReLU)
//     -> runConv(expand)      -> feat5  (16채널, 1x1, activation 없음)
//     -> runDeconv(deconv)    -> feat6  (3채널 @256×256, 2x 확대) ← 여기서 처음 크기가 커진다
//     -> featuresToRgb(3채널)  -> 출력 텍스처(256×256) -> blit
//
// conv·deconv 는 직접 구현하지 않는다. src/core/cnn.ts 의 CnnRunner / uploadConvLayer /
// uploadDeconvLayer / createFeatureBuffer 를 그대로 쓴다. weight 는 이미 생성된 학습 결과를
// import 한다(수정 금지).
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
  uploadDeconvLayer,
  createFeatureBuffer,
  type GpuConvLayer,
} from "@core/cnn.ts";
import { fsrcnn } from "../model/fsrcnn-weights.ts";
import bilinearShader from "../shaders/bilinear-upscale.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const LR_W = 128; // 저해상도(low-resolution) 입력 크기 — conv 5장이 모두 이 격자에서 동작
const LR_H = 128;
const SCALE = 2;
const HR_W = LR_W * SCALE; // 256 — deconvolution 이 만들어 내는 출력 해상도
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

  // 2) WebGPU 초기화. 두 결과(bilinear / FSRCNN)를 나란히 그릴 캔버스 2개.
  const { device } = await initWebGPU();
  const biCanvas = document.getElementById("bilinear") as HTMLCanvasElement;
  const frCanvas = document.getElementById("fsrcnn") as HTMLCanvasElement;
  const bi = configureCanvas(device, biCanvas);
  const fr = configureCanvas(device, frCanvas);

  // 3) 텍스처. 입력은 LR(128) 그대로. SRCNN 과 달리 conv 앞에 사전 확대 텍스처가 없다.
  const lrTex = createTextureFromSource(device, lrCanvas, { width: LR_W, height: LR_H });
  // bilinear baseline 결과(256) — FSRCNN 과 비교용. compute 가 쓰고(STORAGE), blit(TEXTURE) 한다.
  const biTex = createStorageTexture(device, HR_W, HR_H);
  // FSRCNN 최종 출력(256).
  const frOutTex = createStorageTexture(device, HR_W, HR_H);

  // 4) bilinear upscale pipeline (비교용 baseline). 18·14장과 동일.
  const bilinearPipeline = createComputePipeline(device, bilinearShader);
  const bilinearBind = device.createBindGroup({
    layout: bilinearPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: lrTex.createView() },
      { binding: 1, resource: biTex.createView() },
    ],
  });
  const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);

  // 5) FSRCNN 셋업 (한 번만).
  //    conv 5장(extract,shrink,map1,map2,expand)은 모두 LR(128×128) 해상도에서 same-padding.
  //    마지막 deconv 만 stride 2 로 256×256 을 만든다.
  const runner = new CnnRunner(device);
  // layers[0..4] = conv 5장, layers[5] = deconv.
  const convLayers: GpuConvLayer[] = fsrcnn.layers
    .slice(0, 5)
    .map((layer) => uploadConvLayer(device, layer, LR_W, LR_H));
  const [extract, shrink, map1, map2, expand] = convLayers;
  // deconv: stride/padding/output_padding 으로 출력이 정확히 256×256 이 되게 한다.
  //   outW = (inW-1)*stride - 2*pad + kw + outputPadding = 127*2 - 8 + 9 + 1 = 256.
  const deconv = uploadDeconvLayer(
    device,
    fsrcnn.layers[5],
    LR_W,
    LR_H,
    fsrcnn.deconv!.stride,
    fsrcnn.deconv!.padding,
    fsrcnn.deconv!.output_padding,
  );

  // feature buffer: conv 단계는 LR(128), deconv 출력만 HR(256).
  const feat0 = createFeatureBuffer(device, LR_W, LR_H, 3); // rgbToFeatures 결과
  const feat1 = createFeatureBuffer(device, LR_W, LR_H, extract.outC); // 16
  const feat2 = createFeatureBuffer(device, LR_W, LR_H, shrink.outC); // 8
  const feat3 = createFeatureBuffer(device, LR_W, LR_H, map1.outC); // 8
  const feat4 = createFeatureBuffer(device, LR_W, LR_H, map2.outC); // 8
  const feat5 = createFeatureBuffer(device, LR_W, LR_H, expand.outC); // 16
  const feat6 = createFeatureBuffer(device, HR_W, HR_H, deconv.outC); // 3 @ 256×256

  const blitter = new Blitter(device, bi.format);

  // 6) bilinear 확대(비교용) 한 번 실행. 시간도 잰다.
  const biMs = await measureGpuMs(device, () => {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(bilinearPipeline);
    pass.setBindGroup(0, bilinearBind);
    pass.dispatchWorkgroups(bgx, bgy);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });
  blitter.blit(bi.context, biTex); // 가운데: bilinear 확대 결과

  // 7) FSRCNN 추론. 한 command encoder 에 conv 5장 + deconv 1장을 묶어 한 번에 제출하고 시간을 잰다.
  const frMs = await measureGpuMs(device, () => {
    const encoder = device.createCommandEncoder();
    // LR 텍스처 -> 3채널 feature buffer (128×128).
    runner.rgbToFeatures(encoder, lrTex, feat0, LR_W, LR_H);
    // --- LR 해상도에서 conv 5장 ---
    runner.runConv(encoder, extract, feat0, feat1); // 3 -> 16 (5x5, ReLU)
    runner.runConv(encoder, shrink, feat1, feat2); // 16 -> 8 (1x1)
    runner.runConv(encoder, map1, feat2, feat3); // 8 -> 8 (3x3, ReLU)
    runner.runConv(encoder, map2, feat3, feat4); // 8 -> 8 (3x3, ReLU)
    runner.runConv(encoder, expand, feat4, feat5); // 8 -> 16 (1x1)
    // --- 여기서 처음으로 크기가 커진다: deconvolution 으로 2x 확대 (128 -> 256) ---
    runner.runDeconv(encoder, deconv, feat5, feat6); // 16 -> 3 (9x9, stride 2)
    // 3채널 feature(256) -> RGBA 출력 텍스처. unorm 텍스처라 [0,1] 로 자동 clamp.
    runner.featuresToRgb(encoder, feat6, frOutTex, HR_W, HR_H, 3);
    device.queue.submit([encoder.finish()]);
  });
  blitter.blit(fr.context, frOutTex); // 오른쪽: FSRCNN 결과

  // 8) 숫자 비교: 진짜 HR 원본 대비 차이. FSRCNN 이 bilinear 보다 원본에 가까우면(더 작은 diff)
  //    "디테일을 더 복원했다"는 증거다. (tiny FSRCNN 은 gain 이 작을 수 있다 — 정직하게 표시.)
  const hrPixels = hrCanvas.getContext("2d")!.getImageData(0, 0, HR_W, HR_H).data;
  const hrRef = new Uint8Array(hrPixels.buffer.slice(0));
  const biPixels = await readTextureRGBA(device, biTex, HR_W, HR_H);
  const frPixels = await readTextureRGBA(device, frOutTex, HR_W, HR_H);
  const biDiff = maxAbsDiff(hrRef, biPixels);
  const frDiff = maxAbsDiff(hrRef, frPixels);

  stats.set("입력(LR) → 출력(HR)", `${LR_W}×${LR_H} → ${HR_W}×${HR_H}`);
  stats.set("처리 해상도", `conv 5장 = LR ${LR_W}, deconv 가 ${HR_W} 로 확대`);
  stats.set("bilinear 시간", `${biMs.toFixed(2)} ms`);
  stats.set("FSRCNN 추론 시간", `${frMs.toFixed(2)} ms (conv 5 + deconv 1)`);
  stats.set("bilinear vs 원본 HR 최대차", `${biDiff} / 255`);
  stats.set("FSRCNN vs 원본 HR 최대차", `${frDiff} / 255`);
  stats.set(
    "판정",
    frDiff <= biDiff
      ? "✅ FSRCNN 이 원본에 더 가까움 (디테일 복원)"
      : "ℹ️ tiny 모델이라 영역별로 다름 (매끄러운 곳은 bilinear 가 강함)",
  );
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
