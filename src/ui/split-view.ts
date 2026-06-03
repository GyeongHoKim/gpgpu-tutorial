/**
 * <split-view> : 두 개 이상의 결과를 나란히 보여준다 (예: 입력 vs GPU 출력, 원본 vs SR).
 * 자식으로 <figure><figcaption>라벨</figcaption><canvas>...</figure> 를 slot 으로 받는다.
 */
class SplitView extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display: flex; gap: 16px; flex-wrap: wrap; }
        /* ::slotted 는 슬롯에 들어온 요소 자신만 겨냥할 수 있다 (그 안의 figcaption 은 못 건드림).
           figcaption 세부 스타일은 lesson 의 light DOM 쪽 <style> 에서 준다. */
        ::slotted(figure) { margin: 0; color: #e5e7eb; font: 13px system-ui, sans-serif; }
      </style>
      <slot></slot>
    `;
  }
}
if (!customElements.get("split-view")) customElements.define("split-view", SplitView);
