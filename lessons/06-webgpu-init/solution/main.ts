// 6장 정답 코드. WebGPU 초기화의 raw API 흐름을 한 줄씩 직접 보여준다.
//
// 이 챕터가 가르치는 개념이 바로 "초기화"이므로, src/core/webgpu.ts 의
// initWebGPU / configureCanvas 를 쓰지 않고 그 안에서 일어나는 일을 그대로 펼쳐 쓴다.
//   navigator.gpu.requestAdapter() -> adapter.requestDevice() -> device.queue
//   canvas.getContext("webgpu") -> context.configure()
//   navigator.gpu.getPreferredCanvasFormat()
//
// 즉 src/core/webgpu.ts 의 initWebGPU/configureCanvas 는 "바로 이 코드를 함수로 감싼 것"이다.
// 7장부터는 이 보일러플레이트를 매번 다시 쓰지 않고 @core/webgpu.ts 를 import 해서 쓴다.

import "@ui/lesson-shell.ts";
import "@ui/stats-panel.ts";

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 0) WebGPU 지원 여부부터 확인한다.
  //    navigator.gpu 가 없으면 이 브라우저/환경은 WebGPU 자체를 모른다.
  if (!navigator.gpu) {
    throw new Error(
      "이 브라우저는 WebGPU 를 지원하지 않습니다. (navigator.gpu 가 없음)\n" +
        "Chrome/Edge 113+, Safari 26+, Firefox 141+(Windows) 에서 열어주세요.",
    );
  }

  // 1) GPUAdapter: 어떤 물리 GPU 를 쓸지 고르는 "후보"다.
  //    주의: requestAdapter() 는 await 가 필요한 비동기 호출이고,
  //          하드웨어/드라이버 사정에 따라 null 을 돌려줄 수 있다. 반드시 null 체크.
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("GPUAdapter 를 가져오지 못했습니다. (요청 거부 또는 하드웨어 미지원)");
  }

  // 2) GPUDevice: 실제로 명령을 보내는 "논리적 연결"이다. adapter 에서 연다.
  //    이것도 비동기. device 는 앞으로 모든 GPU 객체(buffer, texture, pipeline)를 만드는 출발점이다.
  const device = await adapter.requestDevice();

  // 3) GPUQueue: device 에 1개 존재. 인코딩한 명령(command buffer)을 GPU 에 제출하는 창구.
  //    submit() / writeBuffer() / writeTexture() 가 모두 이 queue 를 통한다.
  const queue = device.queue;

  // 주의: device 는 비동기로 "사라질(lost)" 수 있다. (탭 백그라운드, 드라이버 리셋 등)
  //       lost 는 Promise 로 통지되므로 미리 핸들러를 걸어둔다. 신입이 가장 놓치기 쉬운 부분.
  device.lost.then((info) => {
    console.error(`GPU device lost: ${info.reason} - ${info.message}`);
    stats.set("device 상태", `lost (${info.reason})`);
  });

  // 4) GPUCanvasContext: <canvas> 에서 "webgpu" context 를 얻어 화면과 GPU 를 잇는다.
  //    canvas.getContext("2d") / "webgl" 과 같은 자리에 "webgpu" 가 들어간다.
  const canvas = document.getElementById("gpu") as HTMLCanvasElement;
  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("canvas 에서 webgpu context 를 얻지 못했습니다.");
  }

  // 5) texture format: 이 플랫폼에서 canvas 출력에 가장 좋은 포맷을 물어본다.
  //    보통 "bgra8unorm" 또는 "rgba8unorm". 직접 추측하지 말고 항상 이 함수에 맡긴다.
  const format = navigator.gpu.getPreferredCanvasFormat();

  // 6) context.configure(): canvas context 에 device 와 format 을 연결한다.
  //    이걸 호출해야 비로소 이 canvas 에 GPU 가 그릴 수 있다. (이 챕터는 그리진 않는다)
  context.configure({ device, format, alphaMode: "opaque" });

  // --- 여기까지가 src/core/webgpu.ts 의 initWebGPU + configureCanvas 가 하는 일 전부다. ---

  // 7) adapter 정보를 읽어 화면에 표시한다.
  //    limits: GPU 가 보장하는 한계값(버퍼 크기, workgroup 크기 등). 후속 챕터에서 자주 본다.
  //    features: 선택적으로 켤 수 있는 추가 기능 목록. 존재 여부를 has() 로 확인한다.
  //    info: 어떤 GPU 를 잡았는지 알려주는 정보(vendor/architecture/device/description).
  //          예전에는 비동기 requestAdapterInfo() 였지만 지금은 동기 프로퍼티다.
  //          25장에서 다룰 "기기마다 성능·한계가 다르다" 를 눈으로 확인하는 첫 창구다.
  const limits = adapter.limits;
  const info = adapter.info;
  const hasTimestamp = adapter.features.has("timestamp-query");

  stats.set("WebGPU", "준비 완료");
  stats.set("canvas format", format);
  stats.set("GPU", `${info.vendor || "?"} / ${info.architecture || "?"}`);
  stats.set("max buffer size", `${(limits.maxBufferSize / (1024 * 1024)).toFixed(0)} MB`);
  stats.set(
    "max workgroup X",
    `${limits.maxComputeWorkgroupSizeX}`,
  );
  stats.set(
    "max invocations/wg",
    `${limits.maxComputeInvocationsPerWorkgroup}`,
  );
  stats.set("timestamp-query", hasTimestamp ? "있음" : "없음");
  stats.set("device 상태", "alive");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
