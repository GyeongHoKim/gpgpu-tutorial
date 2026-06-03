/**
 * CNN 추론 엔진 (storage buffer 기반 feature map).
 *
 * feature map 은 rgba8 텍스처(채널 4개)에 안 들어가므로 `array<f32>` storage buffer 로 다룬다.
 * 레이아웃은 channel-last: index = (y*width + x)*channels + c.
 *
 * 구성:
 *   RGB 텍스처 --rgbToFeatures--> feature buffer(3ch)
 *              --runConv(여러 번)--> feature buffer(Nch)
 *              --featuresToRgb--> 출력 텍스처 --blit--> 화면
 *
 * weight 는 model/architecture.md 의 `[outC][inC][kh][kw]` 레이아웃(PyTorch Conv2d) 그대로.
 */
import { createStorageBuffer, createUniformBuffer } from "./buffer.ts";
import type { SrLayer } from "./sr-model.ts";
import convCode from "./shaders/conv.wgsl" with { type: "text" };
import rgbToFeatCode from "./shaders/rgb-to-features.wgsl" with { type: "text" };
import featToRgbCode from "./shaders/features-to-rgb.wgsl" with { type: "text" };

/** width×height×channels 짜리 float feature buffer 를 만든다. */
export function createFeatureBuffer(
  device: GPUDevice,
  width: number,
  height: number,
  channels: number,
): GPUBuffer {
  return device.createBuffer({
    size: Math.max(16, width * height * channels * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
}

/** GPU 에 올라간 conv layer (weight·bias·params 버퍼). 한 번 올리고 매 프레임 재사용한다. */
export interface GpuConvLayer {
  weight: GPUBuffer;
  bias: GPUBuffer;
  params: GPUBuffer;
  inC: number;
  outC: number;
  /** params 에 baked-in 된 처리 크기. runConv 는 이 크기로 dispatch 해야 strides 와 어긋나지 않는다. */
  width: number;
  height: number;
}

/**
 * SrLayer(conv) 를 GPU 버퍼로 올린다. 입력/출력 feature map 의 width·height 는 같다(same padding).
 * deconvolution 은 spatial 크기가 바뀌므로 이 함수가 아니라 별도 셰이더로 처리한다(19장).
 */
export function uploadConvLayer(
  device: GPUDevice,
  layer: SrLayer,
  width: number,
  height: number,
): GpuConvLayer {
  if (layer.type !== "conv") {
    throw new Error(`uploadConvLayer: conv 레이어만 지원합니다 (받음: ${layer.type}).`);
  }
  // weight/bias 길이가 선언된 모양과 맞는지 검증 (잘못된 export 를 조용히 넘기지 않게).
  const expectWeight = layer.outC * layer.inC * layer.kh * layer.kw;
  if (layer.weight.length !== expectWeight) {
    throw new Error(
      `conv "${layer.name}": weight 길이 ${layer.weight.length} != ${expectWeight} (outC*inC*kh*kw).`,
    );
  }
  if (layer.bias.length !== layer.outC) {
    throw new Error(`conv "${layer.name}": bias 길이 ${layer.bias.length} != outC ${layer.outC}.`);
  }
  const weight = createStorageBuffer(device, layer.weight);
  const bias = createStorageBuffer(device, layer.bias);
  const params = createUniformBuffer(
    device,
    new Uint32Array([
      width,
      height,
      layer.inC,
      layer.outC,
      layer.kh,
      layer.kw,
      layer.activation === "relu" ? 1 : 0,
      0,
    ]),
  );
  return { weight, bias, params, inC: layer.inC, outC: layer.outC, width, height };
}

export class CnnRunner {
  private convPipeline: GPUComputePipeline;
  private rgbPipeline: GPUComputePipeline;
  private featPipeline: GPUComputePipeline;

  constructor(private device: GPUDevice) {
    const make = (code: string) =>
      device.createComputePipeline({
        layout: "auto",
        compute: { module: device.createShaderModule({ code }), entryPoint: "main" },
      });
    this.convPipeline = make(convCode);
    this.rgbPipeline = make(rgbToFeatCode);
    this.featPipeline = make(featToRgbCode);
  }

  private dispatch(pass: GPUComputePassEncoder, width: number, height: number): void {
    pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
  }

  /** RGB 텍스처 -> 3채널 feature buffer. */
  rgbToFeatures(
    encoder: GPUCommandEncoder,
    inputTex: GPUTexture,
    outBuf: GPUBuffer,
    width: number,
    height: number,
  ): void {
    const dims = createUniformBuffer(this.device, new Uint32Array([width, height, 0, 0]));
    const bg = this.device.createBindGroup({
      layout: this.rgbPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTex.createView() },
        { binding: 1, resource: { buffer: outBuf } },
        { binding: 2, resource: { buffer: dims } },
      ],
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.rgbPipeline);
    pass.setBindGroup(0, bg);
    this.dispatch(pass, width, height);
    pass.end();
  }

  /**
   * conv layer 한 장 실행: inBuf -> outBuf.
   * dispatch 크기는 layer 에 baked-in 된 width/height 를 쓴다(params 의 strides 와 항상 일치).
   */
  runConv(
    encoder: GPUCommandEncoder,
    layer: GpuConvLayer,
    inBuf: GPUBuffer,
    outBuf: GPUBuffer,
  ): void {
    const bg = this.device.createBindGroup({
      layout: this.convPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inBuf } },
        { binding: 1, resource: { buffer: outBuf } },
        { binding: 2, resource: { buffer: layer.weight } },
        { binding: 3, resource: { buffer: layer.bias } },
        { binding: 4, resource: { buffer: layer.params } },
      ],
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.convPipeline);
    pass.setBindGroup(0, bg);
    this.dispatch(pass, layer.width, layer.height);
    pass.end();
  }

  /**
   * feature buffer -> RGBA 텍스처.
   * selChannel < 0 : 앞 3채널을 RGB 로(최종 출력). selChannel >= 0 : 그 채널을 grayscale 로(feature 시각화).
   */
  featuresToRgb(
    encoder: GPUCommandEncoder,
    inBuf: GPUBuffer,
    outTex: GPUTexture,
    width: number,
    height: number,
    channels: number,
    selChannel = -1,
  ): void {
    const params = createUniformBuffer(
      this.device,
      new Int32Array([width, height, channels, selChannel]),
    );
    const bg = this.device.createBindGroup({
      layout: this.featPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inBuf } },
        { binding: 1, resource: outTex.createView() },
        { binding: 2, resource: { buffer: params } },
      ],
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.featPipeline);
    pass.setBindGroup(0, bg);
    this.dispatch(pass, width, height);
    pass.end();
  }
}
