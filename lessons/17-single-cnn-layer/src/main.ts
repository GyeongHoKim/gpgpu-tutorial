// 실습: 아래 TODO 를 채워 conv layer 한 장(RGB 3 → feature 16, ReLU)을 완성하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 흐름 (전부 src/core 의 CNN 엔진을 가져다 씁니다 — 직접 셰이더를 짜지 않습니다):
//   입력 텍스처 --rgbToFeatures--> 3채널 feature buffer
//              --runConv--------> 16채널 feature buffer (각 픽셀: o = ReLU(W·p + b))
//              --featuresToRgb(선택채널)--> 출력 텍스처 --blit--> 화면
//
// 16채널 feature map 은 rgba8(4채널) 텍스처에 안 들어가므로 storage buffer 로 다룹니다.
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import { createTextureFromSource, createStorageTexture } from "@core/texture.ts";
import { Blitter } from "@core/blit.ts";
import { measureGpuMs } from "@core/gpu-timer.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import { CnnRunner, createFeatureBuffer, uploadConvLayer } from "@core/cnn.ts";
import { exampleConvLayer, channelLabels } from "../model/weights.ts";

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };
  const channelSel = document.getElementById("channel") as HTMLSelectElement;

  // 1) 입력 이미지 생성 + 표시 (제공됨)
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화 (제공됨)
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) TODO: 입력 텍스처와 출력 storage 텍스처를 만드세요.
  //    힌트: createTextureFromSource(device, srcCanvas, { width: WIDTH, height: HEIGHT })
  //          createStorageTexture(device, WIDTH, HEIGHT)

  // 4) TODO: feature buffer 2장을 만드세요 (입력 3채널, conv 결과 16채널).
  //    힌트: createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.inC)   // 3채널
  //          createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.outC)  // 16채널
  //    왜 텍스처가 아니라 buffer? rgba8 텍스처는 채널이 4개뿐이라 16채널이 안 들어갑니다.

  // 5) TODO: CnnRunner 를 만들고, exampleConvLayer 를 GPU 에 올리세요(한 번만).
  //    힌트: const runner = new CnnRunner(device);
  //          const conv = uploadConvLayer(device, exampleConvLayer, WIDTH, HEIGHT);

  // 6) select 채널 목록 채우기 (제공됨 — 0~15, 라벨 포함)
  channelSel.innerHTML = channelLabels
    .map((label, i) => `<option value="${i}">${label}</option>`)
    .join("");

  // 7) TODO: 선택 채널 하나의 feature map 을 계산해 화면에 그리는 render() 를 완성하세요.
  //    한 command encoder 안에서 순서대로:
  //      runner.rgbToFeatures(encoder, inputTex, inFeat, WIDTH, HEIGHT)
  //      runner.runConv(encoder, conv, inFeat, outFeat)
  //      runner.featuresToRgb(encoder, outFeat, outputTex, WIDTH, HEIGHT, conv.outC, selChannel)
  //    그 다음 device.queue.submit([encoder.finish()]) → blitter.blit(context, outputTex)
  //    (measureGpuMs 로 감싸면 GPU 시간도 잴 수 있습니다)
  const blitter = new Blitter(device, format);
  async function render(selChannel: number) {
    // TODO: 위 순서대로 인코딩 → submit → blit → stats.set(...)
    void selChannel; void blitter; void measureGpuMs;
  }

  // 8) select 변경 시 그 채널을 다시 그립니다 (제공됨)
  channelSel.addEventListener("change", () => {
    void render(Number(channelSel.value));
  });

  // 9) 처음엔 채널 0 을 그립니다.
  await render(0);

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
  // 사용하지 않는 import 경고를 피하려고 임시로 참조만 해둡니다. 구현하면서 지우세요.
  void createTextureFromSource; void createStorageTexture;
  void CnnRunner; void createFeatureBuffer; void uploadConvLayer;
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
