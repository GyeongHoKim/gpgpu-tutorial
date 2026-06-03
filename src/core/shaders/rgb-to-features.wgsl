// RGB 텍스처를 3채널 feature buffer 로 변환 (CNN 의 첫 입력 만들기).
// 출력 레이아웃: channel-last, index = (y*width + x)*3 + c.

struct Dims { width: u32, height: u32, _p0: u32, _p1: u32 };

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> outBuf: array<f32>;
@group(0) @binding(2) var<uniform> d: Dims;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= d.width || gid.y >= d.height) {
    return;
  }
  let c = textureLoad(inputTex, vec2i(i32(gid.x), i32(gid.y)), 0);
  let base = (gid.y * d.width + gid.x) * 3u;
  outBuf[base + 0u] = c.r;
  outBuf[base + 1u] = c.g;
  outBuf[base + 2u] = c.b;
}
