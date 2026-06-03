// 입력 텍스처를 2x nearest-neighbor 로 확대하는 compute shader (비교용, 선택).
// bilinear 와 나란히 토글해 "계단 vs 매끈"의 차이를 눈으로 확인하기 위한 것이다.
//
// 좌표 규약은 src/math/upscale.ts 의 nearestUpscale 와 같다:
//   sx = floor(x / scale),  sy = floor(y / scale)

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

const SCALE: f32 = 2.0;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let outDims = textureDimensions(outputTex);
  if (gid.x >= outDims.x || gid.y >= outDims.y) {
    return;
  }

  // 가장 가까운 원본 픽셀 하나를 그대로 복제한다.
  let sx = i32(floor(f32(gid.x) / SCALE));
  let sy = i32(floor(f32(gid.y) / SCALE));

  let color = textureLoad(inputTex, vec2i(sx, sy), 0);
  textureStore(outputTex, vec2i(i32(gid.x), i32(gid.y)), color);
}
