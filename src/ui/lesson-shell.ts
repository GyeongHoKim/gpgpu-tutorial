/**
 * <lesson-shell> : 모든 lesson 의 공통 레이아웃 (네이티브 Web Component).
 * 제목(title 속성), 설명/무대/컨트롤 slot 을 제공한다.
 * 신입은 이 컴포넌트를 가져다 쓰기만 한다 (직접 구현 대상이 아님).
 *
 * 사용 예:
 *   <lesson-shell title="13. GPU Grayscale">
 *     <span slot="desc">설명</span>
 *     <split-view slot="stage">...</split-view>
 *     <stats-panel slot="controls"></stats-panel>
 *   </lesson-shell>
 */
class LessonShell extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute("title") ?? "Lesson";
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display: block; font-family: system-ui, sans-serif; color: #e5e7eb;
                background: #0b0f1a; min-height: 100vh; padding: 24px; box-sizing: border-box; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .desc { color: #9ca3af; font-size: 14px; margin-bottom: 16px; }
        .stage { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
        .controls { margin-top: 16px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
        ::slotted(canvas) { background: #111827; border: 1px solid #1f2937;
                            border-radius: 6px; image-rendering: pixelated; }
      </style>
      <h1>${title}</h1>
      <div class="desc"><slot name="desc"></slot></div>
      <div class="stage"><slot name="stage"></slot></div>
      <div class="controls"><slot name="controls"></slot></div>
    `;
  }
}
// HMR 로 모듈이 다시 실행돼도 중복 등록으로 throw 하지 않도록 가드.
if (!customElements.get("lesson-shell")) customElements.define("lesson-shell", LessonShell);
