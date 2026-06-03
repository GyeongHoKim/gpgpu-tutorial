// 로컬 개발 서버. lesson 의 index.html 을 Bun 이 번들링(TS·WGSL 포함)해서 서빙한다.
//
// 사용:  bun run dev          (기본 = 파일럿 13장)
//        bun run dev 13
//
// 새 lesson 을 추가하면 아래 lessons 레지스트리에 한 줄 등록한다.
import lesson03 from "../lessons/03-pixel-data/index.html";
import lesson04 from "../lessons/04-cpu-image-filters/index.html";
import lesson05 from "../lessons/05-cpu-convolution/index.html";
import lesson06 from "../lessons/06-webgpu-init/index.html";
import lesson07 from "../lessons/07-buffer-and-texture/index.html";
import lesson08 from "../lessons/08-bind-group-and-pipeline/index.html";
import lesson09 from "../lessons/09-wgsl-basics/index.html";
import lesson10 from "../lessons/10-wgsl-bindings/index.html";
import lesson11 from "../lessons/11-compute-shader-basics/index.html";
import lesson12 from "../lessons/12-texture-load-store/index.html";
import lesson13 from "../lessons/13-gpu-basic-filters/index.html";

// 개념 챕터(01, 02)는 실행 코드가 없어 등록하지 않는다 (README 만 존재).
const lessons: Record<string, unknown> = {
  "03": lesson03,
  "04": lesson04,
  "05": lesson05,
  "06": lesson06,
  "07": lesson07,
  "08": lesson08,
  "09": lesson09,
  "10": lesson10,
  "11": lesson11,
  "12": lesson12,
  "13": lesson13,
};

// 레지스트리 키는 2자리("04")다. "4" 처럼 1자리로 넘겨도 동작하도록 정규화한다.
const rawArg = process.argv[2] ?? "13";
const arg = /^\d+$/.test(rawArg) ? rawArg.padStart(2, "0") : rawArg;
const html = lessons[arg] ?? lesson13;
if (!lessons[arg]) {
  console.warn(`lesson "${rawArg}" 이 아직 없습니다. 13장으로 엽니다.`);
}

const server = Bun.serve({
  port: 5173,
  development: true,
  // HTML 라우트. Bun 이 <script type="module"> 와 WGSL import 를 번들링한다.
  routes: { "/": html as never },
});

console.log(`개발 서버: http://localhost:${server.port}  (lesson ${arg})`);
console.log("WebGPU 지원 브라우저(Chrome/Edge 최신 등)로 열어주세요.");
