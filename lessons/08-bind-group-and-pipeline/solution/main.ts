// 8장 정답 코드.
// 주제: bind group ↔ @binding ↔ 셰이더 변수의 3자 대응, 그리고
//       compute pipeline 의 raw 와이어링을 "장황한 그대로" 직접 본다.
//
// 흐름: 입력 텍스처 -> compute shader(copy, passthrough) -> 출력 storage 텍스처
//       -> 화면에 blit (입력과 똑같이 보이면 성공)
import { initWebGPU, configureCanvas } from "@core/webgpu.ts";
import {
  createTextureFromSource,
  createStorageTexture,
} from "@core/texture.ts";
import { createComputePipeline, dispatchSizeFor } from "@core/pipeline.ts";
import { Blitter } from "@core/blit.ts";
import { makeTestImageCanvas } from "@core/test-image.ts";
import copyShader from "../shaders/copy.wgsl" with { type: "text" };

import "@ui/lesson-shell.ts";
import "@ui/split-view.ts";
import "@ui/stats-panel.ts";

const WIDTH = 256;
const HEIGHT = 256;

async function main() {
  const stats = document.getElementById("stats") as HTMLElement & {
    set(label: string, value: string): void;
  };

  // 1) 입력 이미지를 코드로 생성하고 입력 캔버스에 그린다.
  const srcCanvas = makeTestImageCanvas(WIDTH, HEIGHT);
  (document.getElementById("src") as HTMLCanvasElement)
    .getContext("2d")!
    .drawImage(srcCanvas, 0, 0);

  // 2) WebGPU 초기화.
  const { device } = await initWebGPU();
  const gpuCanvas = document.getElementById("gpu") as HTMLCanvasElement;
  const { context, format } = configureCanvas(device, gpuCanvas);

  // 3) 입력 텍스처(읽기) + 출력 storage 텍스처(쓰기).
  //    주의: 같은 텍스처를 입력이자 출력으로 동시에 쓸 수 없다. 반드시 별도 텍스처여야 한다.
  const inputTex = createTextureFromSource(device, srcCanvas, {
    width: WIDTH,
    height: HEIGHT,
  });
  const outputTex = createStorageTexture(device, WIDTH, HEIGHT);

  // 4) compute pipeline.
  //    createComputePipeline 은 내부적으로 layout: "auto" 로 만든다.
  //    "auto" 는 셰이더의 @group/@binding 선언을 보고 bind group layout 을
  //    드라이버가 자동으로 추론하게 한다. 이 챕터에서는 이 한 줄만 재사용한다.
  const pipeline = createComputePipeline(device, copyShader);

  // 5) bind group — 여기가 이 챕터의 핵심이라 "장황하게" 직접 만든다.
  //
  //    bind group 은 "어떤 GPU 리소스를 어떤 @binding 번호에 꽂을지"를 적은 표다.
  //    entries 의 binding 번호는 셰이더의 @binding 번호와 정확히 일치해야 한다.
  //
  //      copy.wgsl                         이 코드
  //      @binding(0) inputTex      <----->  { binding: 0, resource: inputTex.createView() }
  //      @binding(1) outputTex     <----->  { binding: 1, resource: outputTex.createView() }
  //
  //    layout 은 pipeline 이 "auto" 로 만든 bind group layout(group 0)을 그대로 가져온다.
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: inputTex.createView() },
      { binding: 1, resource: outputTex.createView() },
    ],
  });

  // 6) compute pass — 명령을 encoder 에 "기록"하고 큐에 "제출(submit)"한다.
  //    GPU 는 비동기다. submit 은 작업을 큐에 넣을 뿐, 그 자리에서 실행을 기다리지 않는다.
  const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);

  const encoder = device.createCommandEncoder(); // 명령 기록기
  const pass = encoder.beginComputePass(); // compute 작업 구간 시작
  pass.setPipeline(pipeline); // 어떤 셰이더/파이프라인을 쓸지
  pass.setBindGroup(0, bindGroup); // group 0 에 어떤 리소스를 꽂을지
  pass.dispatchWorkgroups(gx, gy); // workgroup 을 gx×gy 개 실행
  pass.end(); // 구간 종료
  device.queue.submit([encoder.finish()]); // 기록한 명령을 큐에 제출

  // 7) 결과를 화면에 그린다 (blit).
  //    Blitter 내부가 바로 render pipeline 의 실제 예시다 (src/core/blit.ts).
  //    storage 텍스처는 그 자체로 화면에 나오지 않으므로, 작은 render pass 로
  //    화면 전체를 덮고 그 위에 텍스처를 샘플링해 그린다.
  const blitter = new Blitter(device, format);
  blitter.blit(context, outputTex);

  stats.set("파이프라인", "compute (copy / passthrough)");
  stats.set("bind group", "0:입력 view, 1:출력 storage view");
  stats.set("판정", "오른쪽이 왼쪽과 똑같으면 ✅ 성공 (복사 완료)");
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#f87171; padding:16px; white-space:pre-wrap">${String(err)}</pre>`,
  );
});
