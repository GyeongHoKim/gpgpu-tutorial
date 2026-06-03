// 입력 텍스처를 textureLoad 로 읽어, per-pixel 변환을 한 뒤 textureStore 로 출력 텍스처에 쓴다.
// 이 챕터의 핵심: textureLoad / textureStore / 좌표 범위 체크 / clamp / 입력≠출력 분리.
//
// 변환은 일부러 CPU 로 그대로 재현 가능한 것을 골랐다: R 채널과 B 채널을 맞바꾼다(채널 스왑).
// 그래야 CPU 결과와 maxAbsDiff 로 숫자 비교가 깔끔하다.

// 입력은 읽기 전용 sampled 텍스처, 출력은 쓰기 전용 storage 텍스처. (둘은 반드시 다른 텍스처)
@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

// 좌표를 [0, dims-1] 범위로 가두는(clamp) 헬퍼.
// 이웃 픽셀을 읽을 때 좌표가 이미지 밖으로 나가면 textureLoad 결과가 정의되지 않으므로,
// 항상 유효한 좌표가 되도록 가장자리 값으로 눌러준다(=clamp-to-edge).
fn clampCoord(coord: vec2i, dims: vec2u) -> vec2i {
  let maxXY = vec2i(i32(dims.x) - 1, i32(dims.y) - 1);
  return clamp(coord, vec2i(0, 0), maxXY);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(inputTex);

  // 1) 범위 체크: dispatch 는 8의 배수로 올림되므로 이미지 '밖' 픽셀을 맡은 invocation 이 생긴다.
  //    이걸 거르지 않고 textureStore 하면 범위 밖 좌표에 쓰게 된다. 반드시 버린다.
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  // 2) 이 invocation 이 맡은 좌표.
  let coord = vec2i(i32(gid.x), i32(gid.y));

  // 3) clamp 로 좌표를 한 번 더 안전하게 가둔다.
  //    범위 체크를 통과한 coord 는 이미 유효하므로 여기선 값이 바뀌지 않지만,
  //    이웃 픽셀(coord + (-1,0) 등)을 읽을 때 이 패턴이 필수임을 보여주기 위해 함께 둔다.
  let safeCoord = clampCoord(coord, dims);

  // 4) textureLoad 로 입력 픽셀을 읽는다. 세 번째 인자 0 은 mip level 0.
  let color = textureLoad(inputTex, safeCoord, 0);

  // 5) per-pixel 변환: R <-> B 채널 스왑. (CPU 로 그대로 재현 가능)
  let swapped = vec4f(color.b, color.g, color.r, color.a);

  // 6) textureStore 로 '같은 좌표'의 출력 텍스처에 쓴다. 입력과 출력은 서로 다른 텍스처다.
  textureStore(outputTex, coord, swapped);
}
