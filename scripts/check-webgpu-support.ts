// WebGPU 는 브라우저 기능이라 CLI(Bun/Node)에서 직접 확인할 수 없다.
// 이 스크립트는 확인 방법을 안내한다.
console.log("WebGPU 지원 확인 안내");
console.log("");
console.log("1) 개발 서버를 띄웁니다:   bun run dev");
console.log("2) 아래 브라우저로 엽니다:  Chrome, Edge (최신), 또는 WebGPU 지원 Safari");
console.log("3) 페이지가 정상 동작하면 WebGPU 가 지원되는 것입니다.");
console.log("   - 콘솔에서 navigator.gpu 가 존재해야 합니다.");
console.log("   - Chrome 은 chrome://gpu 에서 'WebGPU' 항목이 enabled 인지 확인할 수 있습니다.");
console.log("");
console.log("navigator.gpu 가 undefined 라면: 브라우저가 미지원이거나 플래그가 꺼진 상태입니다.");
