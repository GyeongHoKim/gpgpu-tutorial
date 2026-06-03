// 입력 텍스처를 읽어 "tint(색조)"를 섞어 출력 텍스처에 쓰는 compute shader.
// 이 챕터의 주제는 "바인딩"이다. 아래 세 줄이 핵심이다:
//   - @group / @binding 으로 리소스에 주소를 붙인다.
//   - var<uniform> / texture_2d / texture_storage_2d 로 "주소 공간"과 "바인딩 타입"을 선언한다.
//   - JS 쪽 createBindGroup 의 entries 가 이 @binding 번호와 1:1로 대응한다.

// uniform 버퍼로 올리는 상수 묶음.
// 주의: vec3f 는 16바이트로 정렬된다. 이 레이아웃의 바이트 오프셋은 README 의 표를 보라.
struct Params {
  tint: vec3f,     // offset 0  (size 12, align 16)
  strength: f32,   // offset 12 (size 4,  align 4)  ← vec3f 뒤 패딩 자리에 딱 들어간다
}

@group(0) @binding(0) var inputTex: texture_2d<f32>;                              // 읽기 전용 sampled texture
@group(0) @binding(1) var<uniform> params: Params;                               // uniform 주소 공간
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;      // 쓰기 전용 storage texture

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = textureDimensions(inputTex);

  // dispatch 는 8의 배수로 올림되므로, 이미지 밖으로 나간 invocation 은 버린다.
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  let coord = vec2i(i32(gid.x), i32(gid.y));

  // sampler 없이 정수 좌표로 픽셀 하나를 정확히 읽는다 (textureLoad).
  // 마지막 인자 0 은 mip level. sampler 와의 차이는 README 참고.
  let src = textureLoad(inputTex, coord, 0);

  // tint 를 strength 비율로 선형 보간한다: out = mix(src, tint, strength).
  let tinted = mix(src.rgb, params.tint, params.strength);

  textureStore(outputTex, coord, vec4f(tinted, src.a));
}
