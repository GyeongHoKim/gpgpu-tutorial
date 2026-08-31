// WebGPU 는 브라우저 기능이라 CLI(Bun/Node)에서 직접 확인할 수 없다.
// 이 스크립트는 확인 방법을 안내한다.
console.log("WebGPU 지원 확인 안내");
console.log("");
console.log("1) 개발 서버를 띄웁니다:   bun run dev");
console.log("2) 아래 브라우저로 엽니다:");
console.log("   - Chrome / Edge 113+ (데스크톱), Android 121+");
console.log("   - Safari 26+ (macOS Tahoe 26 / iOS 26 / iPadOS 26)");
console.log("   - Firefox 141+ (Windows), 145+ (Apple Silicon macOS)");
console.log("     * Linux 의 Firefox 는 아직 지원 준비 중입니다.");
console.log("3) 페이지가 정상 동작하면 WebGPU 가 지원되는 것입니다.");
console.log("   - 콘솔에서 navigator.gpu 가 존재해야 합니다.");
console.log("   - Chrome 은 chrome://gpu 에서 'WebGPU' 항목이 enabled 인지 확인할 수 있습니다.");
console.log("");
console.log("navigator.gpu 가 undefined 라면: 브라우저 버전이 낮거나, 해당 플랫폼이 아직 미지원이거나,");
console.log("http(비보안 컨텍스트)로 열었을 수 있습니다. https 또는 http://localhost 로 여세요.");
