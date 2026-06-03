// 실습: 아래 TODO 를 채워 WebGPU 를 raw API 로 초기화하세요.
// 막히면 같은 폴더의 solution/main.ts 와 비교하세요.
//
// 이 챕터의 목표는 "초기화가 실제로 어떤 호출의 연속인지"를 손으로 짜보는 것입니다.
// 그래서 일부러 @core/webgpu.ts 의 initWebGPU/configureCanvas 를 쓰지 않습니다.
// (7장부터는 그 헬퍼를 import 해서 씁니다.)
//
// 흐름: navigator.gpu 확인
//       -> requestAdapter() -> requestDevice() -> device.queue
//       -> canvas.getContext("webgpu") -> getPreferredCanvasFormat() -> context.configure()
//       -> adapter 정보를 stats 패널에 표시

import "@ui/lesson-shell.ts";
import "@ui/stats-panel.ts";

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 0) TODO: navigator.gpu 가 없으면 친절한 에러를 throw 하세요.
  //    (없으면 이 브라우저가 WebGPU 자체를 모르는 것 — main().catch 가 화면에 표시합니다)

  // 1) TODO: GPUAdapter 를 얻으세요.
  //    힌트: const adapter = await navigator.gpu.requestAdapter();
  //    주의: await 가 필요하고, adapter 가 null 일 수 있으니 null 체크 후 throw.

  // 2) TODO: adapter 에서 GPUDevice 를 여세요.
  //    힌트: const device = await adapter.requestDevice();

  // 3) TODO: device.queue 로 GPUQueue 를 얻으세요. (명령 제출 창구)

  // 3-1) TODO(선택): device.lost.then(...) 으로 device lost 핸들러를 걸어 콘솔에 남기세요.

  // 4) TODO: id="gpu" 캔버스에서 "webgpu" context 를 얻으세요.
  //    힌트: const context = canvas.getContext("webgpu"); (null 이면 throw)

  // 5) TODO: 선호 canvas format 을 얻으세요.
  //    힌트: const format = navigator.gpu.getPreferredCanvasFormat();

  // 6) TODO: context.configure({ device, format, alphaMode: "opaque" }) 로 연결하세요.

  // 7) TODO: adapter.limits 와 adapter.features 로 정보를 읽어
  //          stats.set("WebGPU", "준비 완료"), stats.set("canvas format", format) 등으로 표시하세요.
  //          예) adapter.limits.maxBufferSize, adapter.features.has("timestamp-query")

  stats.set("상태", "src/main.ts 의 TODO 를 채우세요");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
