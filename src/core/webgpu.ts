/**
 * WebGPU 초기화 공통 유틸.
 * 모든 GPU 챕터는 여기서 device 를 얻는다. 챕터마다 초기화를 다시 짜지 않는다.
 */

export interface GpuContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  queue: GPUQueue;
}

/** adapter -> device 를 얻는다. WebGPU 미지원이면 친절한 에러를 던진다. */
export async function initWebGPU(): Promise<GpuContext> {
  if (!navigator.gpu) {
    throw new Error(
      "이 브라우저는 WebGPU 를 지원하지 않습니다. (navigator.gpu 가 없음)\n" +
        "Chrome/Edge 113+, Safari 26+, Firefox 141+(Windows) 에서 열어주세요.",
    );
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("GPUAdapter 를 가져오지 못했습니다. (요청 거부 또는 하드웨어 미지원)");
  }
  const device = await adapter.requestDevice();
  // device lost 는 비동기로 통지된다. 신입이 놓치기 쉬우므로 콘솔에 남긴다.
  device.lost.then((info) => {
    console.error(`GPU device lost: ${info.reason} - ${info.message}`);
  });
  return { adapter, device, queue: device.queue };
}

export interface CanvasTarget {
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

/** canvas 에 webgpu context 를 붙이고, 선호 포맷으로 설정한다. */
export function configureCanvas(
  device: GPUDevice,
  canvas: HTMLCanvasElement,
): CanvasTarget {
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("canvas 에서 webgpu context 를 얻지 못했습니다.");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });
  return { context, format };
}
