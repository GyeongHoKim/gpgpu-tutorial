// 입력 텍스처 없이, 좌표만으로 패턴을 생성하는 첫 compute shader.
// "픽셀 하나당 invocation 하나" 모델을 그대로 보여준다.
//
// 각 invocation 은 자기 global_invocation_id(=픽셀 좌표)만 가지고
// 색을 계산해 출력 storage 텍스처에 써넣는다. 입력은 없다.

// 출력 이미지 크기(width, height). dispatch 와 셰이더가 같은 크기를 보게
// uniform 으로 넘겨준다. (입력 텍스처가 없어 textureDimensions 를 못 쓰므로)
struct Dims {
  size: vec2u,
};
@group(0) @binding(0) var<uniform> dims: Dims;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  // 범위 체크: dispatch 개수는 8의 배수로 올림되므로,
  // 이미지 밖을 맡은 invocation 이 생긴다. 반드시 버려야 한다.
  if (gid.x >= dims.size.x || gid.y >= dims.size.y) {
    return;
  }

  let coord = vec2i(i32(gid.x), i32(gid.y));

  // 픽셀 좌표를 0~1 범위의 UV 로 정규화한다.
  // u = x / (width-1), v = y / (height-1)
  let uv = vec2f(gid.xy) / vec2f(dims.size - vec2u(1u));

  // (1) UV 그라데이션: R 은 가로 위치, G 는 세로 위치로 채운다.
  let gradient = vec3f(uv.x, uv.y, 0.5);

  // (2) 체커보드: 32픽셀 칸으로 흑/백 격자를 만든다.
  let cell = vec2u(gid.xy / 32u);
  let checker = f32((cell.x + cell.y) % 2u);

  // 그라데이션 위에 체커보드를 은은하게 섞어, 좌표가 invocation 마다
  // 다르다는 것을 눈으로 확인할 수 있게 한다.
  let color = mix(gradient, vec3f(checker), 0.25);

  textureStore(outputTex, coord, vec4f(color, 1.0));
}
