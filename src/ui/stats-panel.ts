/**
 * <stats-panel> : FPS, GPU 처리 시간, 검증 수치 등을 라벨-값 행으로 표시한다.
 *
 * 매 프레임 갱신이 필요한 경우, React 처럼 리렌더하지 않고 textContent 를 직접 고친다.
 * 이런 단순/고빈도 갱신에는 vanilla 가 프레임워크보다 단순하고 빠르다.
 *
 * 사용:  panel.set("GPU 시간", "1.23 ms")
 */
class StatsPanel extends HTMLElement {
  private rows = new Map<string, HTMLElement>();

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display: inline-block; font: 13px ui-monospace, monospace; color: #e5e7eb;
                background: #111827; border: 1px solid #1f2937; border-radius: 6px; padding: 10px 14px; }
        .row { display: flex; justify-content: space-between; gap: 16px; padding: 2px 0; }
        .label { color: #9ca3af; }
        .value { color: #34d399; }
      </style>
      <div id="root"></div>
    `;
  }

  /** 라벨에 해당하는 값을 갱신한다. 라벨이 없으면 새 행을 만든다. */
  set(label: string, value: string) {
    const root = this.shadowRoot?.getElementById("root");
    if (!root) return;
    let row = this.rows.get(label);
    if (!row) {
      row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span class="label"></span><span class="value"></span>`;
      row.querySelector(".label")!.textContent = label;
      root.appendChild(row);
      this.rows.set(label, row);
    }
    row.querySelector(".value")!.textContent = value;
  }
}
if (!customElements.get("stats-panel")) customElements.define("stats-panel", StatsPanel);
