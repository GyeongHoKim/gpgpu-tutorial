// 입력 텍스처의 luma(밝기) 평면에 3x3 convolution 을 적용해 출력 텍스처에 쓴다.
// 픽셀 하나당 invocation 하나가 배정되고, 그 invocation 은 주변 3x3 을 읽어
// kernel 과 가중합(= 내적) 한 번을 계산한다.
//
// kernel 9개 값 + bias 는 storage buffer 로 전달한다.
// 레이아웃: data[0..8] = K0..K8 (왼쪽 위 -> 오른쪽 아래), data[9] = bias.
// storage 주소 공간의 array<f32> 는 stride 가 4바이트라 패딩 없이 그대로 펴 넣을 수 있다.
// (uniform 으로 올리면 array 원소마다 16바이트로 정렬돼 빈 공간이 생긴다. 그 정렬 함정을
//  피하려고 여기서는 storage 를 쓴다 — README 의 `> 주의:` 참고.)

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<storage, read> kernelData: array<f32, 10>;

// CPU 의 src/math/color.ts(lumaOf)·convolution.ts 와 같은 규약을 쓰기 위한 luma 가중치.
const LUMA = vec3f(0.2126, 0.7152, 0.0722);

// 좌표를 [0, size-1] 로 자른다. src/math/convolution.ts 의 clampCoord 와 같은 clamp-to-edge.
// 이게 경계 픽셀 처리의 핵심이다: 이미지 밖 이웃을 가장 가까운 가장자리 픽셀로 끌어당긴다.
fn clampCoord(v: i32, maxExclusive: i32) -> i32 {
  return clamp(v, 0, maxExclusive - 1);
}

// (x, y) 위치의 luma 밝기 한 값을 읽는다. 0~1 범위.
fn lumaAt(x: i32, y: i32, dims: vec2i) -> f32 {
  let cx = clampCoord(x, dims.x);
  let cy = clampCoord(y, dims.y);
  let color = textureLoad(inputTex, vec2i(cx, cy), 0);
  return dot(color.rgb, LUMA);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let dims = vec2i(textureDimensions(inputTex));

  // dispatch 는 8의 배수로 올림되므로, 이미지 밖 invocation 은 버린다 (13장과 동일).
  if (i32(gid.x) >= dims.x || i32(gid.y) >= dims.y) {
    return;
  }

  let x = i32(gid.x);
  let y = i32(gid.y);

  // 핵심: 주변 3x3 패치 벡터 i 와 kernel 벡터 k 의 내적 + bias.
  //   acc = sum_{j,i} I(x+i, y+j) * K(i, j) + b
  // 패치를 왼쪽 위(-1,-1) 부터 오른쪽 아래(1,1) 로 펴서 kernelData[0..8] 와 1:1 로 맞춘다.
  var acc = kernelData[9]; // bias 로 시작
  var k = 0;
  for (var j = -1; j <= 1; j = j + 1) {
    for (var i = -1; i <= 1; i = i + 1) {
      acc = acc + lumaAt(x + i, y + j, dims) * kernelData[k];
      k = k + 1;
    }
  }

  // edge/sharpen 은 음수나 1 초과가 나올 수 있다. rgba8unorm 은 0~1 로 클램프해 저장하므로
  // 여기서 saturate(= clamp(v,0,1)) 로 같은 범위에 맞춘다. CPU 비교도 동일하게 0~255 클램프한다.
  let v = saturate(acc);
  textureStore(outputTex, vec2i(x, y), vec4f(v, v, v, 1.0));
}
