// 입력 텍스처(현재 비디오 프레임)를 읽어 grayscale 로 바꿔 출력 텍스처에 쓰는 compute shader.
// 13장의 grayscale 과 완전히 같다 — 입력이 "정지 이미지"에서 "비디오 프레임"으로 바뀌었을 뿐,
// 픽셀 하나당 invocation 하나가 처리하는 셰이더 자체는 그대로다.

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(inputTex);

  // dispatch 는 8의 배수로 올림되므로, 이미지 밖으로 나간 invocation 은 버린다.
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2i(i32(gid.x), i32(gid.y));
  let color = textureLoad(inputTex, coord, 0);

  // luma = RGB 와 가중치 벡터의 내적 (dot product).
  let luma = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));

  textureStore(outputTex, coord, vec4f(luma, luma, luma, color.a));
}
