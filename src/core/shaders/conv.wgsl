// 일반 convolution layer (storage buffer -> storage buffer).
// feature map 레이아웃: channel-last, index = (y*width + x)*C + c.
// weight 레이아웃: [outC][inC][kh][kw] (PyTorch Conv2d.weight 순서),
//   index = ((k*inC + c)*kh + i)*kw + j.
// PyTorch Conv2d 와 동일한 cross-correlation + replicate(clamp-to-edge) padding 을 구현한다.
// (입력 feature 와 출력 feature 의 width/height 는 같다 — same padding)

struct Params {
  width: u32,
  height: u32,
  inC: u32,
  outC: u32,
  kh: u32,
  kw: u32,
  useRelu: u32,
  _pad: u32,
};

@group(0) @binding(0) var<storage, read> inBuf: array<f32>;
@group(0) @binding(1) var<storage, read_write> outBuf: array<f32>;
@group(0) @binding(2) var<storage, read> weight: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
@group(0) @binding(4) var<uniform> p: Params;

fn clampi(v: i32, maxv: i32) -> i32 {
  return clamp(v, 0, maxv - 1);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= p.width || gid.y >= p.height) {
    return;
  }
  let x = i32(gid.x);
  let y = i32(gid.y);
  let W = i32(p.width);
  let H = i32(p.height);
  let kh = i32(p.kh);
  let kw = i32(p.kw);
  let oy = kh / 2; // kernel 중심 오프셋 (same padding)
  let ox = kw / 2;

  for (var k: u32 = 0u; k < p.outC; k = k + 1u) {
    var acc: f32 = bias[k];
    for (var c: u32 = 0u; c < p.inC; c = c + 1u) {
      for (var i: i32 = 0; i < kh; i = i + 1) {
        for (var j: i32 = 0; j < kw; j = j + 1) {
          let sy = clampi(y + i - oy, H); // 경계는 clamp-to-edge (replicate)
          let sx = clampi(x + j - ox, W);
          let inIdx = (u32(sy) * p.width + u32(sx)) * p.inC + c;
          let wIdx = ((k * p.inC + c) * p.kh + u32(i)) * p.kw + u32(j);
          acc = acc + inBuf[inIdx] * weight[wIdx];
        }
      }
    }
    if (p.useRelu == 1u) {
      acc = max(acc, 0.0);
    }
    let outIdx = (gid.y * p.width + gid.x) * p.outC + k;
    outBuf[outIdx] = acc;
  }
}
