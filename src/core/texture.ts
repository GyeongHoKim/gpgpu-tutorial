/**
 * 텍스처 생성·업로드·읽기 공통 유틸.
 */

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

/** 소스(canvas/ImageBitmap)에서 sampled 텍스처를 만든다. (rgba8unorm) */
export function createTextureFromSource(
  device: GPUDevice,
  source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
  size: { width: number; height: number },
): GPUTexture {
  const texture = device.createTexture({
    size: [size.width, size.height],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source, flipY: false },
    { texture },
    [size.width, size.height],
  );
  return texture;
}

/**
 * compute shader 가 써넣을 storage 텍스처.
 * blit 로 화면에 그릴 수 있도록 TEXTURE_BINDING 도, 읽기 검증용으로 COPY_SRC 도 켠다.
 */
export function createStorageTexture(
  device: GPUDevice,
  width: number,
  height: number,
  format: GPUTextureFormat = "rgba8unorm",
): GPUTexture {
  return device.createTexture({
    size: [width, height],
    format,
    usage:
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_SRC,
  });
}

/**
 * 텍스처를 CPU 로 읽어온다 (rgba8unorm 기준). 길이 width*height*4 의 Uint8Array(RGBA).
 *
 * 주의: GPU 는 비동기다. 큐에 제출했다고 끝난 게 아니라, mapAsync 로 결과를 기다려야 한다.
 * 또한 copyTextureToBuffer 의 bytesPerRow 는 256 의 배수여야 하므로, 행 패딩을 제거한다.
 */
export async function readTextureRGBA(
  device: GPUDevice,
  texture: GPUTexture,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const bytesPerRow = align(width * 4, 256);
  const buffer = device.createBuffer({
    size: bytesPerRow * height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, [width, height]);
  device.queue.submit([encoder.finish()]);

  await buffer.mapAsync(GPUMapMode.READ);
  const padded = new Uint8Array(buffer.getMappedRange());

  // 행마다 앞 width*4 바이트만 추려 패딩을 제거한다.
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const src = y * bytesPerRow;
    out.set(padded.subarray(src, src + width * 4), y * width * 4);
  }

  buffer.unmap();
  buffer.destroy();
  return out;
}
