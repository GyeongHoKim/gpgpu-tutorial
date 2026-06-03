// 텍스처를 화면(canvas)에 그리는 fullscreen-quad blit 셰이더.
// compute 결과(storage texture)는 그 자체로 화면에 나오지 않으므로,
// 삼각형 하나로 화면 전체를 덮고 그 위에 텍스처를 샘플링해 그린다.

@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

struct VsOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VsOut {
  // 화면 전체를 덮는 큰 삼각형 1개 (clip space).
  var corners = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  let xy = corners[i];
  var out: VsOut;
  out.pos = vec4f(xy, 0.0, 1.0);
  // clip space(-1..1, y 위로) -> uv(0..1, y 아래로) 변환. Y 를 뒤집는다.
  out.uv = vec2f((xy.x + 1.0) * 0.5, 1.0 - (xy.y + 1.0) * 0.5);
  return out;
}

@fragment
fn fs(in: VsOut) -> @location(0) vec4f {
  return textureSampleLevel(tex, samp, in.uv, 0.0);
}
