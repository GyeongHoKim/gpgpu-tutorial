// 로컬 개발 서버. lesson 의 index.html 을 Bun 이 번들링(TS·WGSL 포함)해서 서빙한다.
//
// 사용:  bun run dev          (기본 = 파일럿 13장)
//        bun run dev 13
//
// 새 lesson 을 추가하면 아래 lessons 레지스트리에 한 줄 등록한다.
import lesson13 from "../lessons/13-gpu-basic-filters/index.html";

const lessons: Record<string, unknown> = {
  "13": lesson13,
};

const arg = process.argv[2] ?? "13";
const html = lessons[arg] ?? lesson13;
if (!lessons[arg]) {
  console.warn(`lesson "${arg}" 이 아직 없습니다. 13장으로 엽니다.`);
}

const server = Bun.serve({
  port: 5173,
  development: true,
  // HTML 라우트. Bun 이 <script type="module"> 와 WGSL import 를 번들링한다.
  routes: { "/": html as never },
});

console.log(`개발 서버: http://localhost:${server.port}  (lesson ${arg})`);
console.log("WebGPU 지원 브라우저(Chrome/Edge 최신 등)로 열어주세요.");
