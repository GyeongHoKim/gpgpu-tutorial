// ─────────────────────────────────────────────────────────────────────────────
// 교육용 예시 필터 (학습된 게 아님!)
// ─────────────────────────────────────────────────────────────────────────────
// 이 파일의 16개 filter 는 "학습된 weight" 가 아니라, 16장의 메시지
// ("filter 마다 강조하는 특징이 다르다 → feature map 이 서로 다르게 나온다")를
// 눈으로 확인하려고 **사람이 손으로 채운** kernel 묶음입니다.
//
// 실제 SRCNN/FSRCNN(18·19장)에서는 이 자리에 `bun run make:weights` 로 생성된
// 학습된 숫자가 들어갑니다. 여기서는 학습을 다루지 않으므로, 효과가 명확히 보이는
// 가로/세로/대각 edge, blur, sharpen, 색 채널 강조 같은 익숙한 필터를 직접 적었습니다.
//
// 레이아웃은 src/core 의 conv.wgsl 과 동일한 PyTorch Conv2d 순서입니다:
//   weight: [outC][inC][kh][kw],  index = ((k*inC + c)*kh + i)*kw + j
//   - outC = 16 (filter 16개 = feature map 16장)
//   - inC  = 3  (RGB)
//   - kh = kw = 3
//   길이 = 16 * 3 * 3 * 3 = 432
//   bias: [outC] = 16
//
// 아래 헬퍼로 "filter 하나(= 입력 채널별 3×3 kernel 묶음)"를 하나씩 만들고,
// 마지막에 432 짜리 Float32Array 로 평탄화합니다.

import type { SrLayer, SrModel } from "@core/sr-model.ts";

const KH = 3;
const KW = 3;
const IN_C = 3; // R, G, B
const OUT_C = 16;

/** 3×3 kernel 하나. (행 우선: [row0..row2], 각 행 3개) */
type Kernel3x3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

/**
 * filter 하나 = 입력 채널(R,G,B)마다 3×3 kernel 한 장씩.
 * weightOf 가 이걸 [inC][kh][kw] 순서로 평탄화한다.
 */
interface Filter {
  /** 화면 select 에서 보여줄 짧은 설명. */
  label: string;
  r: Kernel3x3;
  g: Kernel3x3;
  b: Kernel3x3;
  bias: number;
}

// 자주 쓰는 단일 채널 kernel 들 (15장에서 본 익숙한 필터).
const IDENTITY: Kernel3x3 = [0, 0, 0, 0, 1, 0, 0, 0, 0];
const ZERO: Kernel3x3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const BLUR: Kernel3x3 = [
  1 / 9, 1 / 9, 1 / 9,
  1 / 9, 1 / 9, 1 / 9,
  1 / 9, 1 / 9, 1 / 9,
];
const SHARPEN: Kernel3x3 = [0, -1, 0, -1, 5, -1, 0, -1, 0];
const EDGE_H: Kernel3x3 = [-1, -1, -1, 0, 0, 0, 1, 1, 1]; // 가로 경계 (위/아래 밝기 차)
const EDGE_V: Kernel3x3 = [-1, 0, 1, -1, 0, 1, -1, 0, 1]; // 세로 경계 (좌/우 밝기 차)
const EDGE_D1: Kernel3x3 = [-2, -1, 0, -1, 0, 1, 0, 1, 2]; // 대각 ↘ (Sobel-ish)
const EDGE_D2: Kernel3x3 = [0, -1, -2, 1, 0, -1, 2, 1, 0]; // 대각 ↗
const LAPLACE: Kernel3x3 = [0, 1, 0, 1, -4, 1, 0, 1, 0]; // 전방향 edge (밝기 변화량)
const EMBOSS: Kernel3x3 = [-2, -1, 0, -1, 1, 1, 0, 1, 2]; // 양각(emboss)

/** 같은 kernel 을 R·G·B 세 채널에 그대로 적용 → "밝기(luma)에 가까운" 응답. */
function mono(k: Kernel3x3, label: string, bias = 0): Filter {
  return { label, r: k, g: k, b: k, bias };
}

// 16개 filter. 서로 다른 특징이 도드라지도록 의도적으로 다양하게 구성했다.
const FILTERS: Filter[] = [
  // 0~2: 색 채널 강조 (해당 채널만 통과). RGB 분리를 눈으로 보게.
  { label: "0: R 채널 강조", r: IDENTITY, g: ZERO, b: ZERO, bias: 0 },
  { label: "1: G 채널 강조", r: ZERO, g: IDENTITY, b: ZERO, bias: 0 },
  { label: "2: B 채널 강조", r: ZERO, g: ZERO, b: IDENTITY, bias: 0 },

  // 3: 밝기(원본에 가까운 luma) — 세 채널 identity 평균
  {
    label: "3: 밝기(luma)",
    r: [0, 0, 0, 0, 1 / 3, 0, 0, 0, 0],
    g: [0, 0, 0, 0, 1 / 3, 0, 0, 0, 0],
    b: [0, 0, 0, 0, 1 / 3, 0, 0, 0, 0],
    bias: 0,
  },

  // 4~5: blur / sharpen (luma 기준)
  mono(BLUR, "4: blur (흐리게)"),
  mono(SHARPEN, "5: sharpen (또렷하게)"),

  // 6~9: 방향별 edge (가로/세로/두 대각)
  mono(EDGE_H, "6: 가로 edge"),
  mono(EDGE_V, "7: 세로 edge"),
  mono(EDGE_D1, "8: 대각 edge ↘"),
  mono(EDGE_D2, "9: 대각 edge ↗"),

  // 10: 전방향 edge (Laplacian)
  mono(LAPLACE, "10: 전방향 edge"),

  // 11: emboss (양각)
  mono(EMBOSS, "11: emboss"),

  // 12~13: 색 대비(opponent) — 채널 간 차이를 본다. 음수가 나와 ReLU 가 절반을 자른다.
  {
    label: "12: R−G 대비",
    r: IDENTITY,
    g: [0, 0, 0, 0, -1, 0, 0, 0, 0],
    b: ZERO,
    bias: 0,
  },
  {
    label: "13: B−밝기 대비",
    r: [0, 0, 0, 0, -0.5, 0, 0, 0, 0],
    g: [0, 0, 0, 0, -0.5, 0, 0, 0, 0],
    b: IDENTITY,
    bias: 0,
  },

  // 14: 세로 edge 를 R 에서만 (채널별로 다른 kernel 도 가능함을 보여줌)
  { label: "14: R 세로 edge", r: EDGE_V, g: ZERO, b: ZERO, bias: 0 },

  // 15: 어두운 영역 강조 — 음의 밝기 + bias. ReLU 와 bias 의 상호작용을 보게.
  {
    label: "15: 어두운 곳 강조",
    r: [0, 0, 0, 0, -1 / 3, 0, 0, 0, 0],
    g: [0, 0, 0, 0, -1 / 3, 0, 0, 0, 0],
    b: [0, 0, 0, 0, -1 / 3, 0, 0, 0, 0],
    bias: 1.0, // ReLU(1 - luma): 어두울수록 큰 값
  },
];

if (FILTERS.length !== OUT_C) {
  throw new Error(`FILTERS 길이 ${FILTERS.length} != outC ${OUT_C}`);
}

/** filter 하나를 [inC][kh][kw] 순서(R 9개 → G 9개 → B 9개)로 평탄화. */
function filterToWeights(f: Filter): number[] {
  return [...f.r, ...f.g, ...f.b];
}

/** 16개 filter 를 [outC][inC][kh][kw] = 432 짜리 Float32Array 로. */
function buildWeight(): Float32Array {
  const out: number[] = [];
  for (const f of FILTERS) out.push(...filterToWeights(f));
  if (out.length !== OUT_C * IN_C * KH * KW) {
    throw new Error(`weight 길이 ${out.length} != ${OUT_C * IN_C * KH * KW}`);
  }
  return new Float32Array(out);
}

function buildBias(): Float32Array {
  return new Float32Array(FILTERS.map((f) => f.bias));
}

/** 17장에서 GPU 에 올릴 conv layer 한 장 (RGB 3 → feature 16, ReLU). */
export const exampleConvLayer: SrLayer = {
  name: "demo-conv-3to16",
  type: "conv",
  inC: IN_C,
  outC: OUT_C,
  kh: KH,
  kw: KW,
  activation: "relu",
  weight: buildWeight(),
  bias: buildBias(),
};

/** select UI 가 보여줄 채널별 라벨 (0~15). */
export const channelLabels: string[] = FILTERS.map((f) => f.label);

/**
 * 18·19장처럼 SrModel 로도 감싸 둔다(필수는 아니지만 형식 통일).
 * 여기서는 layer 한 장만 들어 있고, 확대/preUpscale 은 없다.
 */
export const demoModel: SrModel = {
  model: "demo-single-layer",
  scale: 1,
  preUpscale: "none",
  layers: [exampleConvLayer],
};
