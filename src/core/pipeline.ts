/**
 * compute pipeline 생성과 dispatch 계산 헬퍼.
 */

/** WGSL 문자열로 compute pipeline 을 만든다. (layout: "auto") */
export function createComputePipeline(
  device: GPUDevice,
  code: string,
  entryPoint = "main",
): GPUComputePipeline {
  const module = device.createShaderModule({ code });
  return device.createComputePipeline({
    layout: "auto",
    compute: { module, entryPoint },
  });
}

/**
 * "픽셀 하나당 invocation 하나" 모델에서 dispatch 할 workgroup 개수를 계산한다.
 * workgroup_size 가 (wx, wy) 일 때 width×height 영역을 덮는 데 필요한 개수.
 * 나누어떨어지지 않으면 올림하고, 셰이더에서 범위 밖 invocation 을 버린다.
 */
export function dispatchSizeFor(
  width: number,
  height: number,
  workgroupSize: [number, number] = [8, 8],
): [number, number] {
  return [
    Math.ceil(width / workgroupSize[0]),
    Math.ceil(height / workgroupSize[1]),
  ];
}
