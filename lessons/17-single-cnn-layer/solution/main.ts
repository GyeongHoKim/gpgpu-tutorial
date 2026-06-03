// 17장 정답 코드. conv layer 한 장(RGB 3 → feature 16, ReLU)을 GPU 로 돌린다.
//
// 흐름 (전부 src/core 의 CNN 엔진 재사용):
//   입력 텍스처 --rgbToFeatures--> 3채널 feature buffer
//              --runConv--------> 16채널 feature buffer (W·p + b → ReLU)
//              --featuresToRgb(selChannel)--> 출력 텍스처(선택 채널 grayscale)
//              --blit-----------> 화면
//
// 16채널 feature map 은 rgba8(4채널) 텍스처에 안 들어가므로 storage buffer(array<f32>)로 다룬다.
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

  // 1) 입력 이미지 생성 + 표시.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) 입력 텍스처 + 출력 텍스처(선택 feature map 을 grayscale 로 그릴 곳).
  const inputTex = createTextureFromSource(device, srcCanvas, {
    width: WIDTH,
    height: HEIGHT,
  });
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 4) feature buffer 2장: 입력 RGB(3채널), conv 결과(16채널).
  //    16채널이라 rgba8 텍스처가 아니라 storage buffer(array<f32>)로 다룬다.
  const inFeat = createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.inC);
  const outFeat = createFeatureBuffer(device, WIDTH, HEIGHT, exampleConvLayer.outC);

  // 5) CNN 엔진 + conv layer 를 GPU 에 한 번 올린다 (매 프레임 재사용).
  const runner = new CnnRunner(device);
  const conv = uploadConvLayer(device, exampleConvLayer, WIDTH, HEIGHT);

  // 6) select 채널 목록 채우기 (0~15, 라벨 포함).
  channelSel.innerHTML = channelLabels
    .map((label, i) => `<option value="${i}">${label}</option>`)
    .join("");

  // 7) 한 채널의 feature map 을 계산해 화면에 그린다.
  const blitter = new Blitter(device, format);

  async function render(selChannel: number) {
    const gpuMs = await measureGpuMs(device, () => {
      const encoder = device.createCommandEncoder();
      // RGB 텍스처 → 3채널 feature buffer
      runner.rgbToFeatures(encoder, inputTex, inFeat, WIDTH, HEIGHT);
      // conv: 3채널 → 16채널 (각 픽셀에서 o = ReLU(W·p + b))
      runner.runConv(encoder, conv, inFeat, outFeat);
      // 16채널 중 선택 채널 하나를 grayscale 로 출력 텍스처에
      runner.featuresToRgb(
        encoder,
        outFeat,
        outputTex,
        WIDTH,
        HEIGHT,
        conv.outC,
        selChannel,
      );
      device.queue.submit([encoder.finish()]);
    });
    blitter.blit(context, outputTex);

    stats.set("feature 채널", `${selChannel} / ${conv.outC - 1}`);
    stats.set("GPU 시간", `${gpuMs.toFixed(2)} ms`);
    stats.set("입력 채널", `${conv.inC} (RGB)`);
    stats.set("출력 채널", `${conv.outC} (feature map)`);
  }

  // 8) select 변경 시 그 채널을 다시 그린다.
  channelSel.addEventListener("change", () => {
    void render(Number(channelSel.value));
  });

  // 9) 처음엔 채널 0 (R 채널 강조)을 그린다.
  await render(0);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
