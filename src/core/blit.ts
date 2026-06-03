import blitShader from "./shaders/blit.wgsl" with { type: "text" };

/**
 * 텍스처를 canvas 에 그리는 fullscreen-quad blit.
 *
 * compute shader 결과(storage texture)는 그 자체로 화면에 나오지 않는다.
 * 작은 render pass 로 화면 전체를 덮고 그 위에 텍스처를 샘플링해 그려야 한다.
 * 거의 모든 GPU 챕터가 이 단계를 쓰므로 공통 클래스로 둔다.
 */
export class Blitter {
  private pipeline: GPURenderPipeline;
  private sampler: GPUSampler;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
  ) {
    const module = device.createShaderModule({ code: blitShader });
    this.pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
  }

  /** texture 를 context 의 현재 프레임에 그린다. */
  blit(context: GPUCanvasContext, texture: GPUTexture): void {
    const view = context.getCurrentTexture().createView();
    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: this.sampler },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
