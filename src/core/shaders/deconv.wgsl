// Transposed convolution (deconvolution) — PyTorch ConvTranspose2d 와 동일.
// LR feature buffer(inH×inW×inC) -> HR feature buffer(outH×outW×outC), stride 만큼 확대.
// weight 레이아웃: [inC][outC][kh][kw] (PyTorch ConvTranspose2d.weight 순서),
//   index = ((c*outC + k)*kh + ky)*kw + kx.
//
// gather 형태: 출력 픽셀 (oy,ox) 에 기여하는 입력 픽셀은
//   iy = (oy + pad - ky) / stride,  ix = (ox + pad - kx) / stride
//   (단, (oy+pad-ky), (ox+pad-kx) 가 stride 로 나누어떨어지고 입력 범위 안일 때만)
// activation 없음(FSRCNN deconv 는 최종 출력 직전). 최종 clamp 는 features-to-rgb 에서.

struct Params {
  inW: u32, inH: u32, outW: u32, outH: u32,
  inC: u32, outC: u32, kh: u32, kw: u32,
  stride: u32, pad: u32, _p0: u32, _p1: u32,
};

@group(0) @binding(0) var<storage, read> inBuf: array<f32>;
@group(0) @binding(1) var<storage, read_write> outBuf: array<f32>;
@group(0) @binding(2) var<storage, read> weight: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
@group(0) @binding(4) var<uniform> p: Params;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= p.outW || gid.y >= p.outH) {
    return;
  }
  let ox = i32(gid.x);
  let oy = i32(gid.y);
  let s = i32(p.stride);
  let pad = i32(p.pad);
  let kh = i32(p.kh);
  let kw = i32(p.kw);
  let inW = i32(p.inW);
  let inH = i32(p.inH);

  for (var k: u32 = 0u; k < p.outC; k = k + 1u) {
    var acc: f32 = bias[k];
    for (var c: u32 = 0u; c < p.inC; c = c + 1u) {
      for (var ky: i32 = 0; ky < kh; ky = ky + 1) {
        let ny = oy + pad - ky;
        if (ny < 0 || (ny % s) != 0) {
          continue;
        }
        let iy = ny / s;
        if (iy < 0 || iy >= inH) {
          continue;
        }
        for (var kx: i32 = 0; kx < kw; kx = kx + 1) {
          let nx = ox + pad - kx;
          if (nx < 0 || (nx % s) != 0) {
            continue;
          }
          let ix = nx / s;
          if (ix < 0 || ix >= inW) {
            continue;
          }
          let inIdx = (u32(iy) * p.inW + u32(ix)) * p.inC + c;
          let wIdx = ((c * p.outC + k) * p.kh + u32(ky)) * p.kw + u32(kx);
          acc = acc + inBuf[inIdx] * weight[wIdx];
        }
      }
    }
    let outIdx = (gid.y * p.outW + gid.x) * p.outC + k;
    outBuf[outIdx] = acc;
  }
}
