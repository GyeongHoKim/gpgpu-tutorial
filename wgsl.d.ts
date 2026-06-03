// `.wgsl` 파일을 `import code from "./x.wgsl" with { type: "text" }` 로
// 불러올 때 TypeScript 가 문자열로 인식하도록 하는 선언.
declare module "*.wgsl" {
  const source: string;
  export default source;
}
