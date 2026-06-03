/**
 * 학습된 SR 모델(SRCNN/FSRCNN)의 weight 표현.
 * scripts/make-weights.ts 가 각 레슨의 model 폴더에 생성하는 weights.ts 가 이 타입을 따른다.
 * 레이아웃 계약은 model/architecture.md 참고.
 */

export type SrLayerType = "conv" | "deconv";

export interface SrLayer {
  name: string;
  type: SrLayerType;
  inC: number;
  outC: number;
  kh: number;
  kw: number;
  activation: "relu" | "none";
  /** conv: [outC][inC][kh][kw], deconv: [inC][outC][kh][kw] 순서로 평탄화 */
  weight: Float32Array;
  /** [outC] */
  bias: Float32Array;
}

export interface SrModel {
  model: string;
  scale: number;
  /** SRCNN 은 입력을 먼저 bilinear 확대("bilinear"), FSRCNN 은 LR 그대로("none") */
  preUpscale: "bilinear" | "none";
  /** FSRCNN deconvolution 파라미터 (있을 때만) */
  deconv?: { stride: number; padding: number; output_padding: number };
  layers: SrLayer[];
}
