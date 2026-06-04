/**
 * 비디오 프레임을 GPU 텍스처로 옮기는 유틸.
 *
 * 핵심 원칙(21~22장): 텍스처는 **한 번** 만들고, 매 프레임 그 텍스처에 현재 프레임만 복사한다.
 * 프레임마다 새 텍스처/버퍼/파이프라인을 만들면 GC·할당으로 프레임이 끊긴다.
 */

/** 비디오 프레임을 받을 텍스처. 한 번 만들고 매 프레임 copyVideoFrameToTexture 로 갱신한다. */
export function createFrameTexture(device: GPUDevice, width: number, height: number): GPUTexture {
  return device.createTexture({
    size: [width, height],
    format: "rgba8unorm",
    // copyExternalImageToTexture 대상은 COPY_DST + RENDER_ATTACHMENT 필요.
    // 셰이더에서 읽으므로 TEXTURE_BINDING 도.
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

/**
 * 현재 비디오 프레임을 텍스처로 복사한다. (재생 중인 <video> 의 현 프레임)
 * 매 프레임 호출하되 texture 는 createFrameTexture 로 만든 것을 재사용한다.
 */
export function copyVideoFrameToTexture(
  device: GPUDevice,
  video: HTMLVideoElement,
  texture: GPUTexture,
  width: number,
  height: number,
): void {
  device.queue.copyExternalImageToTexture(
    { source: video, flipY: false },
    { texture },
    [width, height],
  );
}
