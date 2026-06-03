// 9장: WGSL 기본 문법을 한 화면에 담은 compute shader.
// 입력 텍스처 없이, 픽셀 좌표만으로 색을 "계산"해 출력 텍스처에 써넣는다.
// 목적은 결과의 화려함이 아니라, 아래 코드의 "문법 하나하나를 읽는 것"이다.
// README 가 이 파일을 줄 단위로 해설한다.

// ── 출력 storage 텍스처 (10장에서 자세히. 여기선 "여기에 써넣는다"만 알면 된다) ──
@group(0) @binding(0) var outputTex: texture_storage_2d<rgba8unorm, write>;

// ── 사용자 정의 함수 1: 좌표(uv) -> 그라데이션 색 ──
// fn 이름(매개변수: 타입, ...) -> 반환타입 { ... }
// uv 는 0~1 로 정규화된 좌표(vec2f). 반환은 RGB 색(vec3f).
fn gradientColor(uv: vec2f) -> vec3f {
  // vec 끼리는 +, *, - 가 "원소별"로 동작한다 (선형대수의 벡터 연산).
  let baseColor = vec3f(uv.x, uv.y, 0.5);
  // 스칼라(f32) 와 vec 의 곱은 모든 원소에 그 스칼라를 곱한다.
  let tinted = baseColor * 0.85;
  return tinted;
}

// ── 사용자 정의 함수 2: 중심에서의 거리로 원형 음영 만들기 ──
// distance() 는 두 점 사이의 거리(스칼라 f32)를 돌려준다.
fn vignette(uv: vec2f) -> f32 {
  let center = vec2f(0.5, 0.5);
  let d = distance(uv, center);     // f32
  // clamp(x, lo, hi): x 를 [lo, hi] 로 가둔다. 가장자리일수록 어두워지게 만든다.
  return clamp(1.0 - d, 0.0, 1.0);  // f32
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  // gid 는 vec3u (부호 없는 32비트 정수 3개). 이 픽셀의 (x, y) 좌표가 들어있다.
  let dims: vec2u = textureDimensions(outputTex);  // vec2u

  // dispatch 는 8 의 배수로 올림되므로, 이미지 밖 invocation 은 버린다.
  // u32 끼리의 비교다. (gid.x, dims.x 모두 u32 — 타입이 같아야 비교할 수 있다)
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  // ── 타입 변환: WGSL 은 암묵적 변환이 없다. u32 -> f32 를 직접 명시한다 ──
  // vec2u(gid.x, gid.y) 를 vec2f 로 "생성자 변환" 한다. 이렇게 안 하면 컴파일 에러.
  let pixel: vec2f = vec2f(vec2u(gid.x, gid.y));   // 정수 좌표 -> 실수 좌표
  let size: vec2f = vec2f(dims);                   // vec2u -> vec2f
  // 0~1 정규화. vec / vec 도 원소별 나눗셈이다.
  let uv: vec2f = pixel / size;

  // ── let 과 var 의 차이 ──
  // let: 재대입 불가(상수 바인딩). var: 재대입 가능(가변 변수).
  let g: vec3f = gradientColor(uv);   // let — 이 값은 바뀌지 않는다
  var color: vec3f = g;               // var — 아래에서 값을 바꾼다

  // vignette 음영을 곱해 색을 갱신한다. var 라서 재대입이 가능하다.
  let shade: f32 = vignette(uv);
  color = color * shade;              // 재대입 (let 이었다면 여기서 컴파일 에러)

  // ── bool 과 조건: 체커보드 무늬를 살짝 얹는다 ──
  // i32 로 변환해 정수 나눗셈을 쓴다. (정수 / 정수 = 정수, 소수점 버림)
  let cx: i32 = i32(gid.x) / 32;      // 32 픽셀마다 한 칸
  let cy: i32 = i32(gid.y) / 32;
  // % 는 나머지. (cx + cy) 가 짝수인 칸만 표시.
  let isLight: bool = (cx + cy) % 2 == 0;
  if (isLight) {
    color = color + vec3f(0.08);      // 스칼라 -> vec3f 로 확장(생성자), 살짝 밝게
  }

  // 최종 알파는 1.0. vec4f(vec3, f32) 처럼 vec 과 스칼라를 이어 붙일 수 있다.
  let outColor: vec4f = vec4f(color, 1.0);

  // 출력 좌표는 정수여야 한다 -> vec2i 로 변환해서 textureStore 에 넘긴다.
  let coord: vec2i = vec2i(i32(gid.x), i32(gid.y));
  textureStore(outputTex, coord, outColor);
}
