/**
 * uniform / storage 버퍼 생성 유틸.
 *
 * 주의(alignment): uniform 버퍼에 올리는 구조체는 16바이트 정렬 규칙을 따른다.
 * 특히 WGSL 의 vec3f 는 16바이트로 정렬되므로, JS 쪽 Float32Array 레이아웃을 맞춰야 한다.
 * (자세한 내용은 7장 Buffer 챕터에서 다룬다.)
 */

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

/**
 * data 를 4바이트 배수 길이의 Uint8Array 로 복사한다.
 * writeBuffer 는 쓰는 바이트 수가 4의 배수여야 하므로, 끝을 0 으로 패딩한다.
 */
function toAlignedBytes(data: ArrayBufferView): Uint8Array {
  const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const padded = new Uint8Array(align(data.byteLength, 4));
  padded.set(src);
  return padded;
}

/** 작은 상수 묶음을 올리는 uniform 버퍼. */
export function createUniformBuffer(
  device: GPUDevice,
  data: ArrayBufferView,
): GPUBuffer {
  const bytes = toAlignedBytes(data);
  const buffer = device.createBuffer({
    size: align(bytes.byteLength, 16),
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, bytes);
  return buffer;
}

/** weight/feature map 처럼 큰 배열을 올리는 storage 버퍼. */
export function createStorageBuffer(
  device: GPUDevice,
  data: ArrayBufferView,
  extraUsage: GPUBufferUsageFlags = 0,
): GPUBuffer {
  const bytes = toAlignedBytes(data);
  const buffer = device.createBuffer({
    size: bytes.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | extraUsage,
  });
  device.queue.writeBuffer(buffer, 0, bytes);
  return buffer;
}
