// feature buffer 를 RGBA 텍스처로 변환 (CNN 결과/feature map 을 화면에 그리기 위해).
// - selChannel < 0 : 앞 3채널을 RGB 로 (channels==1 이면 ch0 을 grayscale). 최종 출력용.
// - selChannel >= 0 : 그 채널 하나를 grayscale 로. feature map 한 장 시각화용(17장).
// 값은 [0,1] 로 clamp (rgba8unorm 저장). feature map 값은 범위를 벗어날 수 있어 잘릴 수 있음.
// 입력 레이아웃: channel-last, index = (y*width + x)*channels + c.

struct Params { width: u32, height: u32, channels: u32, selChannel: i32 };

@group(0) @binding(0) var<storage, read> inBuf: array<f32>;
@group(0) @binding(1) var outTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> p: Params;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= p.width || gid.y >= p.height) {
    return;
  }
  let base = (gid.y * p.width + gid.x) * p.channels;
  var r: f32;
  var g: f32;
  var b: f32;
  if (p.selChannel >= 0 && u32(p.selChannel) < p.channels) {
    // 선택한 채널 하나를 grayscale 로 (범위 밖 채널은 무시)
    let v = clamp(inBuf[base + u32(p.selChannel)], 0.0, 1.0);
    r = v; g = v; b = v;
  } else {
    r = clamp(inBuf[base + 0u], 0.0, 1.0);
    g = r;
    b = r;
    if (p.channels >= 3u) {
      g = clamp(inBuf[base + 1u], 0.0, 1.0);
      b = clamp(inBuf[base + 2u], 0.0, 1.0);
    }
  }
  textureStore(outTex, vec2i(i32(gid.x), i32(gid.y)), vec4f(r, g, b, 1.0));
}
