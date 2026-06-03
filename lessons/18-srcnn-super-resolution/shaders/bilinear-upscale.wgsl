// 입력 텍스처를 2x bilinear 로 확대해 출력 storage 텍스처에 쓰는 compute shader.
// (14장 shaders/bilinear-upscale.wgsl 을 그대로 가져왔다.)
//
// SRCNN 은 학습 때 "먼저 bilinear 로 2x 확대한 HR 입력" 위에서 디테일을 복원하도록
// 배웠다. 그래서 conv 스택에 넣기 전에 반드시 이 확대를 먼저 거쳐야 학습과 일치한다.
//
// 좌표 규약(14장과 동일):
//   srcX = (x + 0.5) / scale - 0.5
// 경계는 clamp-to-edge (가장 가까운 가장자리 픽셀로 고정).

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba8unorm, write>;

const SCALE: f32 = 2.0;

// 정수 좌표를 [0, max-1] 로 clamp (clamp-to-edge). textureLoad 는 범위를 벗어나면
// 0 을 주므로, 우리가 직접 가장자리로 고정해야 한다.
fn clampCoord(v: i32, maxExclusive: u32) -> i32 {
  let hi = i32(maxExclusive) - 1;
  return clamp(v, 0, hi);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let inDims = textureDimensions(inputTex);   // 입력 크기 (예: 128x128)
  let outDims = textureDimensions(outputTex); // 출력 크기 (예: 256x256)

  // dispatch 는 8의 배수로 올림되므로, 출력 밖으로 나간 invocation 은 버린다.
  if (gid.x >= outDims.x || gid.y >= outDims.y) {
    return;
  }

  let x = f32(gid.x);
  let y = f32(gid.y);

  // 1) 출력 픽셀 중심 (x+0.5, y+0.5) 를 원본 좌표로 역산한다.
  let srcX = (x + 0.5) / SCALE - 0.5;
  let srcY = (y + 0.5) / SCALE - 0.5;

  // 2) 정수 부분(왼쪽-위 픽셀 x0,y0)과 소수 부분(보간 비율 tx,ty)으로 나눈다.
  let x0 = floor(srcX);
  let y0 = floor(srcY);
  let tx = srcX - x0; // 가로 보간 비율 0..1
  let ty = srcY - y0; // 세로 보간 비율 0..1

  // 3) 주변 4개 픽셀 좌표를 clamp-to-edge 로 고정한다.
  let x0c = clampCoord(i32(x0), inDims.x);
  let x1c = clampCoord(i32(x0) + 1, inDims.x);
  let y0c = clampCoord(i32(y0), inDims.y);
  let y1c = clampCoord(i32(y0) + 1, inDims.y);

  // 4) 네 픽셀을 읽는다 (mip level 0). vec4f 라 RGBA 네 채널을 한 번에 보간한다.
  let v00 = textureLoad(inputTex, vec2i(x0c, y0c), 0);
  let v10 = textureLoad(inputTex, vec2i(x1c, y0c), 0);
  let v01 = textureLoad(inputTex, vec2i(x0c, y1c), 0);
  let v11 = textureLoad(inputTex, vec2i(x1c, y1c), 0);

  // 5) 가로로 위/아래 줄을 각각 보간하고(lerp 2번), 그 둘을 세로로 보간한다(lerp 1번).
  //    mix(a, b, t) = (1 - t) * a + t * b 가 곧 1차 선형보간이다.
  let top = mix(v00, v10, tx);
  let bot = mix(v01, v11, tx);
  let color = mix(top, bot, ty);

  textureStore(outputTex, vec2i(i32(gid.x), i32(gid.y)), color);
}
