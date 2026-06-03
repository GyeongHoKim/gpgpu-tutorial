// 가장 단순한 compute shader: 입력 텍스처를 그대로 출력 텍스처로 복사한다.
// 변환(grayscale, invert 등)은 전혀 하지 않는다. 이 챕터의 주제는
// "셰이더가 무엇을 하는가"가 아니라, 셰이더의 @group/@binding 이
// TypeScript 쪽 bind group 과 어떻게 연결되는가이기 때문이다.

// @group(0) @binding(0) = 입력 텍스처 (읽기 전용, sampled)
@group(0) @binding(0) var inputTex: texture_2d<f32>;
// @group(0) @binding(1) = 출력 텍스처 (쓰기 전용, storage)
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(inputTex);

  // dispatch 는 8의 배수로 올림되므로, 이미지 밖으로 나간 invocation 은 버린다.
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2i(i32(gid.x), i32(gid.y));

  // 읽은 색을 변환 없이 그대로 쓴다 (passthrough).
  let color = textureLoad(inputTex, coord, 0);
  textureStore(outputTex, coord, color);
}
