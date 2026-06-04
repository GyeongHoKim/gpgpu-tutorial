// 비디오 프레임을 읽어 간단한 필터를 적용해 출력 텍스처에 쓰는 compute shader.
// (20장에서 쓰던 것과 같은 구조 — 픽셀 하나당 invocation 하나)
//
// 여기서는 grayscale(luma) 로 변환한다. 21장의 핵심은 "필터가 뭐냐"가 아니라
// 이 compute 를 requestVideoFrameCallback 으로 프레임 단위로 정확히 돌리는 것이다.

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(inputTex);

  // dispatch 는 8의 배수로 올림되므로, 프레임 밖으로 나간 invocation 은 버린다.
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2i(i32(gid.x), i32(gid.y));
  let color = textureLoad(inputTex, coord, 0);

  // luma = RGB 와 Rec.709 가중치 벡터의 내적 (13장에서 본 그 grayscale).
  let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

  textureStore(outputTex, coord, vec4f(luma, luma, luma, color.a));
}
