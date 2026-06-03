// 실습: 아래 TODO 를 채워 학습된 FSRCNN 추론을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// SRCNN(18장)과 핵심 차이:
//   SRCNN  = 먼저 bilinear 로 HR 로 확대 → conv 3장을 HR(256) 해상도에서.
//   FSRCNN = LR(128) 해상도에서 conv 5장을 다 끝낸 뒤, 마지막 deconvolution 으로 확대(256).
// 즉 사전 확대(bilinear)를 conv 앞에 넣지 않습니다. LR 텍스처를 그대로 conv 에 넣습니다.
//
// 흐름:
//   LR 입력(128×128)
//     -> rgbToFeatures -> feat0(3ch @128)
//     -> runConv(extract) -> feat1(16) -> runConv(shrink) -> feat2(8)
//     -> runConv(map1) -> feat3(8) -> runConv(map2) -> feat4(8)
//     -> runConv(expand) -> feat5(16)
//     -> runDeconv(deconv) -> feat6(3ch @256)   ← 여기서 처음 크기가 커진다
//     -> featuresToRgb(3ch) -> 출력 텍스처 -> blit
//
// conv·deconv 는 직접 짜지 않습니다. @core/cnn.ts 의 CnnRunner / uploadConvLayer /
// uploadDeconvLayer / createFeatureBuffer 를 그대로 사용합니다. weight 는 이미 생성된
// 학습 결과를 import 합니다(수정 금지).
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

const LR_W = 128;
const LR_H = 128;
const SCALE = 2;
const HR_W = LR_W * SCALE; // 256
const HR_H = LR_H * SCALE; // 256

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) 입력 이미지 생성 + 표시 (제공됨). HR 원본을 만든 뒤 LR 로 줄여 입력으로 쓴다.
  const hrCanvas = makeTestImageCanvas(HR_W, HR_H);
  const lrCanvas = document.createElement("canvas");
  lrCanvas.width = LR_W;
  lrCanvas.height = LR_H;
  lrCanvas.getContext("2d")!.drawImage(hrCanvas, 0, 0, LR_W, LR_H);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(lrCanvas, 0, 0);

  // 2) WebGPU 초기화 + 두 출력 캔버스 (제공됨).
  const { device } = await initWebGPU();
  const bi = configureCanvas(device, document.getElementById("bilinear") as HTMLCanvasElement);
  const fr = configureCanvas(device, document.getElementById("fsrcnn") as HTMLCanvasElement);

  // 3) TODO: 텍스처 만들기 (크기에 주의 — 입력은 LR, 출력은 HR).
  //    - 입력:  createTextureFromSource(device, lrCanvas, { width: LR_W, height: LR_H })  ← 128
  //    - bilinear baseline: createStorageTexture(device, HR_W, HR_H)  ← 256, 비교용
  //    - FSRCNN 출력:        createStorageTexture(device, HR_W, HR_H)  ← 256

  // 4) TODO: bilinear upscale pipeline + bind group (비교용 baseline. 18·14장과 동일).
  //    binding 0 = 입력 LR 텍스처 view, binding 1 = bilinear HR 텍스처 view.
  //    const [bgx, bgy] = dispatchSizeFor(HR_W, HR_H, [8, 8]);

  // 5) TODO: FSRCNN 셋업 (한 번만).
  //    - const runner = new CnnRunner(device);
  //    - conv 5장: fsrcnn.layers.slice(0, 5) 각각을 uploadConvLayer(device, layer, LR_W, LR_H) 로
  //        올려 [extract, shrink, map1, map2, expand] 를 얻는다. (모두 LR 128 해상도!)
  //    - deconv 1장: uploadDeconvLayer(
  //          device, fsrcnn.layers[5], LR_W, LR_H,
  //          fsrcnn.deconv!.stride, fsrcnn.deconv!.padding, fsrcnn.deconv!.output_padding)
  //    - feature buffer 7개: createFeatureBuffer(device, W, H, ch)
  //        feat0=3@128, feat1=16@128, feat2=8@128, feat3=8@128, feat4=8@128, feat5=16@128,
  //        feat6=3@256  ← deconv 출력만 256!

  // 6) TODO: bilinear 확대 실행 (biTex 채우기) + blit(bi.context, biTex). measureGpuMs 로 시간 측정.

  // 7) TODO: FSRCNN 추론. 한 encoder 에 묶는다 (measureGpuMs).
  //    runner.rgbToFeatures(encoder, lrTex, feat0, LR_W, LR_H)
  //    runner.runConv(encoder, extract, feat0, feat1)
  //    runner.runConv(encoder, shrink, feat1, feat2)
  //    runner.runConv(encoder, map1, feat2, feat3)
  //    runner.runConv(encoder, map2, feat3, feat4)
  //    runner.runConv(encoder, expand, feat4, feat5)
  //    runner.runDeconv(encoder, deconv, feat5, feat6)        ← 여기서 128 -> 256
  //    runner.featuresToRgb(encoder, feat6, frOutTex, HR_W, HR_H, 3)
  //    제출 후 blit(fr.context, frOutTex).

  // 8) TODO: 숫자 비교 — 원본 HR 대비 bilinear / FSRCNN 의 maxAbsDiff.
  //    hrCanvas.getContext("2d").getImageData(...) 로 원본 픽셀을 읽고,
  //    readTextureRGBA 로 두 결과를 읽어 maxAbsDiff 로 비교, stats.set(...) 표시.

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시 참조만 둡니다. 구현하며 지우세요.
  void createTextureFromSource; void createStorageTexture; void readTextureRGBA;
  void createComputePipeline; void dispatchSizeFor; void Blitter; void measureGpuMs;
  void maxAbsDiff; void CnnRunner; void uploadConvLayer; void uploadDeconvLayer;
  void createFeatureBuffer; void fsrcnn; void bilinearShader; void bi; void fr;
  type _Layer = GpuConvLayer;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
