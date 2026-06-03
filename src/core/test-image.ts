/**
 * 샘플 입력 이미지를 코드로 생성한다. (바이너리 에셋 없이 모든 챕터가 같은 입력을 쓰도록)
 * 그라데이션 + 체커보드 + 도형을 섞어, 필터 효과가 눈에 잘 보이게 만든다.
 */
export function makeTestImageCanvas(width = 256, height = 256): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context 를 얻지 못했습니다.");

  // 대각선 색 그라데이션
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1e3a8a");
  grad.addColorStop(0.5, "#db2777");
  grad.addColorStop(1, "#facc15");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 반투명 체커보드 (대비/경계 확인용)
  const cell = 32;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
    }
  }

  // 흰 원 (밝기 대비)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.3, width * 0.12, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}
