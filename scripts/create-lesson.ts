// 새 lesson 폴더의 표준 골격을 생성한다.
// 사용:  bun run create-lesson 14 gpu-bilinear-upscale "14. GPU Bilinear Upscale"
//
// 생성물: lessons/<번호>-<slug>/ 아래 README.md, exercise.md, index.html,
//         src/main.ts, solution/, shaders/
// 생성 후 dev.ts 의 lessons 레지스트리에 등록하는 것을 잊지 마세요.
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const [num, slug, title] = process.argv.slice(2);
if (!num || !slug) {
  console.error('사용법: bun run create-lesson <번호> <slug> "<제목>"');
  process.exit(1);
}

const id = `${num}-${slug}`;
const dir = `lessons/${id}`;
if (existsSync(dir)) {
  console.error(`이미 존재합니다: ${dir}`);
  process.exit(1);
}

const displayTitle = title ?? id;

await mkdir(`${dir}/src`, { recursive: true });
await mkdir(`${dir}/solution`, { recursive: true });
await mkdir(`${dir}/shaders`, { recursive: true });

await writeFile(
  `${dir}/README.md`,
  `# ${displayTitle}\n\n## 학습 목표\n\n(2~3줄)\n\n## 예상 소요 시간 · 난이도\n\n약 ?분 · ★?☆☆☆☆\n\n## 사전 지식\n\n- \n\n## 개념 설명\n\n(시각자료 + 필요한 수식(KaTeX) 포함. CLAUDE.md 규약 참고)\n\n## 완성되면 이런 화면\n\n## 자가 점검 질문\n\n1. \n2. \n3. \n`,
);
await writeFile(`${dir}/exercise.md`, `# 실습 ${displayTitle}\n\n## 과제\n\n1. \n`);
await writeFile(
  `${dir}/index.html`,
  `<!doctype html>\n<html lang="ko">\n  <head>\n    <meta charset="utf-8" />\n    <title>${displayTitle}</title>\n  </head>\n  <body style="margin:0;background:#0b0f1a">\n    <lesson-shell title="${displayTitle}">\n      <span slot="desc"></span>\n    </lesson-shell>\n    <script type="module" src="./src/main.ts"></script>\n  </body>\n</html>\n`,
);
await writeFile(
  `${dir}/src/main.ts`,
  `import "@ui/lesson-shell.ts";\n\n// TODO: 실습 코드\n`,
);

console.log(`생성됨: ${dir}`);
console.log(`다음: scripts/dev.ts 의 lessons 레지스트리에 "${num}" 등록`);
