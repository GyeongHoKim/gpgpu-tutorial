# 실습 24. 디버깅 진단

이 챕터는 코드를 새로 채우는 대신, **고장 시나리오를 증상으로 진단**하는 연습입니다. 각 시나리오마다 (a) 어떤 증상인지, (b) [`docs/webgpu-debugging.md`](../../docs/webgpu-debugging.md) 의 몇 번 항목을 볼지, (c) 가장 먼저 의심할 원인과 확인 방법을 적어 보세요. 정답을 외우는 게 아니라 **"증상 → 원인 후보 → 확인 절차"의 흐름**을 몸에 익히는 게 목표입니다.

## 준비

- 콘솔(개발자도구)을 연다. WebGPU 디버깅의 절반은 콘솔 읽기다.
- 참조 문서 [`docs/webgpu-debugging.md`](../../docs/webgpu-debugging.md) 의 마지막 "증상 → 어디를 볼까" 표를 옆에 둔다.
- 손에 익히려는 공통 코드: `src/core/webgpu.ts`, `src/core/texture.ts`, `src/core/cnn.ts`, `src/math/color.ts`.

## 과제 A — 증상으로 표 찾기

아래 각 증상에 대해 **참조 문서의 몇 번 항목**을 볼지, 그리고 **콘솔에 에러가 날지 안 날지**를 적으세요.

1. 오른쪽 출력이 그냥 검다. 콘솔에는 아무 에러도 없다.
2. 콘솔에 빨간 줄: `... expected resource type ... at binding 1`.
3. 셰이더 한 줄을 고쳤는데 결과가 그대로다. 콘솔도 조용하다.
4. `console.log(await readTextureRGBA(...))` 가 아니라 `console.log(readTextureRGBA(...))` 로 찍었더니 `Promise {<pending>}` 만 나온다.
5. 결과 이미지의 **가장자리 한 줄만** 노이즈가 낀다.
6. 잘 돌아가다가 30초 뒤 갑자기 멈추고 콘솔에 `GPU device lost: ...`.

## 과제 B — 원인 좁히기 (진단 순서 쓰기)

각 시나리오에서 **가장 먼저 확인할 것 → 그다음**을 2~3단계로 적으세요.

1. **검은 화면, 에러 없음.** 7체크리스트 중 에러를 안 내는 것(1·3·4·7)을 어떤 순서로 볼지, 각 단계에서 무엇을 확인하는지.
2. **conv 결과가 전부 깨진다.** bind group `@binding`(0~4)이 `conv.wgsl` 과 맞는지 어떻게 확인할지. `runConv` 의 entries 와 셰이더 선언을 어떻게 대조할지.
3. **upscale 결과 크기가 이상하다.** dispatch 크기·출력 텍스처 크기·deconv 출력 공식(`uploadDeconvLayer` 의 `outW`) 중 무엇부터 볼지.

## 과제 C — CPU 비교로 정확성 판정

`maxAbsDiff`(`src/math/color.ts`)로 GPU 결과를 CPU 기준과 비교했다고 하자. 아래 각 결과를 어떻게 해석할지 적으세요.

1. `maxAbsDiff = 1` → 통과인가? 그 이유는(rgba8unorm 양자화).
2. `maxAbsDiff = 180`, 그런데 큰 차이가 **이미지 전체**에 퍼져 있다 → 무엇을 의심하나.
3. `maxAbsDiff = 200`, 큰 차이가 **음수가 나올 만한 영역(어두운 부분)** 에만 있다 → 무엇을 의심하나(clamp 규약).
4. `maxAbsDiff(...)` 호출이 **예외를 던졌다**: "길이가 다릅니다 (196608 vs 262144)" → 무엇이 잘못됐나(행 패딩 `bytesPerRow` 256 정렬).

## 과제 D — 직접 고장 내보기 (선택)

앞 챕터(예: 13장)의 동작하는 코드에서 **일부러 한 가지를 고장 내고** 증상을 관찰하세요. 한 번에 하나씩만 바꾸고, 콘솔/화면이 어떻게 변하는지 기록합니다.

- 셰이더 함수 이름에 오타(`textureLoad`→`textureLaod`) → `getCompilationInfo()` 메시지의 `lineNum` 확인.
- bind group 의 `binding: 1` 을 `binding: 2` 로 → 콘솔 validation error 문구 확인.
- 출력 텍스처를 `createStorageTexture` 대신 `STORAGE_BINDING` 없이 만들기 → 어디서 에러 나는지.
- readback 호출부의 `await` 제거 → `console.log` 가 무엇을 찍는지.

## 성공 기준

- 6가지 시나리오 각각에 대해 "참조 문서 몇 번 + 에러 유무"를 막힘없이 답할 수 있다.
- "검은 화면 = 무작정 코드 뒤지기"가 아니라 **콘솔 확인 → 증상 표 → 원인 후보 → CPU 비교**의 절차로 접근한다.
- `maxAbsDiff` 결과(작은 값/전 영역/음수 영역/길이 예외)를 보고 원인 영역을 구분할 수 있다.

> 막히면 [`docs/webgpu-debugging.md`](../../docs/webgpu-debugging.md) 의 해당 항목을, 절차 전체는 [README](./README.md) 의 6단 구조를 다시 보세요.
</content>
</invoke>
