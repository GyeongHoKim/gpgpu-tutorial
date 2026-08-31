# WebGPU/WGSL 디버깅 체크리스트 (참조 문서)

이 문서는 챕터를 진행하다 막혔을 때 펼쳐 보는 **현장 체크리스트**입니다. 여러 챕터가 "막히면 여기를 보라"고 이 문서를 가리킵니다. 개념을 처음 배우는 곳이 아니라, **증상으로 원인을 빨리 좁히는** 도구로 쓰세요.

전체 흐름의 디버깅 순서는 24장(`lessons/24-debugging/README.md`)에서 6단 구조로 정리합니다. 이 문서는 그 24장이 참조하는 **세부 레퍼런스**입니다.

> 큰 원칙: GPU 는 "눈으로 비슷"으로 확인하지 않습니다. WebGPU 는 잘못된 사용을 대부분 **검증 에러(validation error)** 로 콘솔에 찍어 주고, 결과의 정확성은 **CPU 기준 구현과 숫자로 비교**(`src/math/` + `maxAbsDiff`)해 확인합니다. 디버깅의 절반은 "콘솔을 제대로 읽는 것"입니다.

---

## 0. 가장 먼저: 콘솔을 켜라

브라우저 개발자도구 콘솔을 **항상 열어 두세요.** WebGPU 의 검증 에러는 던져지는 예외가 아니라 콘솔 경고로 비동기적으로 나오는 경우가 많아, 콘솔을 안 보면 "조용히 검은 화면"만 남습니다.

- 빨간 에러: 대부분 **validation error**(아래 mismatch 표 참조).
- `GPU device lost: ...` : device 가 죽음(7번 항목).
- 아무 에러도 없는데 검은 화면: 1번 체크리스트로.

---

## 1. 검은 화면 7가지 체크리스트

"오른쪽이 그냥 검다" 또는 "아무것도 안 그려진다"일 때 **위에서부터 순서대로** 확인하세요. 위쪽일수록 흔한 원인입니다.

| # | 체크 항목 | 무엇을 확인하나 | 근거 / 관련 코드 |
|---|-----------|-----------------|------------------|
| 1 | **dispatch 를 빠뜨렸나** | `pass.dispatchWorkgroups(...)` 와 `device.queue.submit([encoder.finish()])` 를 실제로 호출했나. 인코더만 만들고 submit 을 안 하면 GPU 는 아무것도 안 한다 | `CnnRunner.dispatch` 가 `Math.ceil(w/8), Math.ceil(h/8)` 로 호출 |
| 2 | **출력 텍스처 usage 가 맞나** | 셰이더가 써넣을 출력은 `STORAGE_BINDING` 이, 화면에 그릴 거면 `TEXTURE_BINDING` 이 켜져 있어야 한다 | `createStorageTexture` 가 `STORAGE_BINDING \| TEXTURE_BINDING \| COPY_SRC` 를 켠다 |
| 3 | **blit 대상이 빈 텍스처인가** | 화면에 그리는 텍스처가 셰이더가 방금 채운 그 텍스처가 맞나(다른 빈 텍스처를 blit 하고 있지 않나) | 8장 README: "오른쪽이 검은 화면이라면" 블록 |
| 4 | **범위 체크에서 전부 return 됐나** | 셰이더 첫머리 `if (gid.x >= dims.x ...) return;` 의 `dims` 값이 0/뒤바뀜이라 모든 invocation 이 즉시 빠져나가지 않나 | 13장 README 범위 체크 주의 블록 |
| 5 | **bind group @binding 이 셰이더와 일치하나** | JS 의 `binding` 번호와 WGSL 의 `@binding` 이 1:1 인가(아래 4-2 표) | `runConv` 의 binding 0~4 가 `conv.wgsl` 선언과 일치 |
| 6 | **canvas 를 configure 했나** | `configureCanvas(device, canvas)` 로 context 를 device 에 붙이고 포맷을 설정했나 | `configureCanvas` 가 `getPreferredCanvasFormat()` 로 설정 |
| 7 | **값이 0~1 밖이라 다 까맣게 클램프됐나** | 출력이 `rgba8unorm`(0~1)인데 음수만 써넣어 전부 0(검정)이 되지 않았나. residual/conv 중간 결과는 음수가 흔하다 | 15장 음수 클리핑, 03장 양자화 주의 블록 |

> 주의(에러 없는 검은 화면이 가장 까다롭다): 1~7 중 **에러를 안 내는** 것은 보통 1·3·4·7 입니다. 5(bind group)·2(usage)는 대개 **validation error 를 콘솔에 찍습니다.** 그러니 먼저 콘솔에 빨간 줄이 있는지 보고, 없으면 1·3·4·7 을 의심하세요.

---

## 2. shader compile error 읽는 법

`device.createShaderModule({ code })` 자체는 에러를 던지지 않습니다. **컴파일 메시지는 비동기**로 나옵니다. 그래서 "셰이더에 분명 오타가 있는데 에러가 안 나요"가 생깁니다. 메시지를 직접 받아 봐야 합니다.

```ts
const module = device.createShaderModule({ code });
const info = await module.getCompilationInfo();
for (const m of info.messages) {
  // m.type: "error" | "warning" | "info"
  console.log(`${m.type} @${m.lineNum}:${m.linePos} — ${m.message}`);
}
```

메시지 읽는 요령:

| 메시지에 있는 것 | 의미 | 자주 나오는 원인 |
|------------------|------|------------------|
| `lineNum` / `linePos` | 몇 번째 줄, 몇 번째 칸 | **줄 번호부터 본다.** 인라인 템플릿 리터럴이면 그 문자열 안에서 센다 |
| `unresolved` / `no matching` | 그 이름의 함수/변수를 못 찾음 | 오타(`textureLaod`), 타입 불일치(`f32` 에 `i32` 전달) |
| `expected ';'` 등 구문 | 파서가 기대한 토큰 | 세미콜론·중괄호 누락 |
| `@binding` 관련 | 바인딩 선언 문제 | `@group`/`@binding` 빠짐, 주소 공간(`var<storage>`) 누락 |

> 주의(번들은 통과하는데 셰이더가 틀린 경우): WGSL 은 `with { type: "text" }` 로 **문자열로 import** 됩니다(CLAUDE.md 규약). TypeScript 번들러는 그 문자열 안의 WGSL 문법을 검사하지 않으므로 `bun build` 가 통과해도 셰이더는 틀려 있을 수 있습니다. WGSL 문법 오류는 위 `getCompilationInfo()` 로만 잡힙니다.

---

## 3. 자주 만나는 mismatch 3종

GPU 가 검은 화면이거나 깨진 결과를 낼 때, 십중팔구 셰이더가 기대하는 모양과 JS 가 넘긴 리소스가 **어긋난** 것입니다. WebGPU 는 이 중 상당수를 validation error 로 잡아 줍니다.

### 3-1. 텍스처 크기 mismatch

| 증상 | 원인 | 해결 |
|------|------|------|
| 결과가 잘리거나 줄무늬/사선으로 깨짐 | dispatch 한 크기와 텍스처 실제 크기가 다름 | 입력·출력 텍스처와 dispatch 를 **하나의 width/height 변수**로 통일. `CnnRunner` 는 layer 에 baked-in 된 `layer.width/height` 로만 dispatch 한다 |
| 확대(upscale) 결과 크기가 이상 | 입력 크기로 출력 텍스처를 만들었음 | 출력은 **출력 크기**로 생성. deconv 는 `outW=(inW-1)*stride-2*pad+kw+outputPadding` (`uploadDeconvLayer`) |
| `copyTextureToBuffer` 결과 길이가 안 맞음 | row 패딩(아래 5번) 미고려 | `readTextureRGBA` 처럼 `bytesPerRow=align(width*4,256)` 후 행마다 패딩 제거 |

### 3-2. bind group @binding mismatch

JS 의 `entries[].binding` 번호와 WGSL 의 `@group(0) @binding(n)` 선언이 **번호·타입·주소 공간까지** 일치해야 합니다. `conv.wgsl` ↔ `runConv` 의 실제 대응:

| @binding | WGSL 선언(주소 공간) | JS resource | 어긋나면 |
|----------|----------------------|-------------|----------|
| 0 | 입력 feature `var<storage, read>` | `{ buffer: inBuf }` | 입력이 0/쓰레기로 읽힘 |
| 1 | 출력 feature `var<storage, read_write>` | `{ buffer: outBuf }` | 출력이 안 써짐(검은 화면) |
| 2 | weight `var<storage, read>` | `{ buffer: layer.weight }` | 가중치가 엉뚱 → 결과 깨짐 |
| 3 | bias `var<storage, read>` | `{ buffer: layer.bias }` | bias 누락/이상 |
| 4 | params `var<uniform>` | `{ buffer: layer.params }` | 크기/채널 수가 0 → 전부 return |

> 주의(번호가 맞아도 타입이 틀릴 수 있다): `binding` 숫자는 맞는데 셰이더는 `texture_2d` 를 기대하는 자리에 buffer 를 꽂으면 validation error 가 납니다. 반대로 **read 자리에 read_write 자원**을 넣는 식의 access 불일치도 에러로 잡힙니다. 콘솔의 "expected ... at binding N" 메시지에서 **N 을 먼저 읽으세요.**

### 3-3. usage flag mismatch

텍스처·버퍼를 만들 때 켠 usage 플래그가, 실제 사용처가 요구하는 것과 맞아야 합니다.

| 사용처 | 필요한 flag | 빠뜨리면 |
|--------|-------------|----------|
| 셰이더가 써넣는 storage 텍스처 | `STORAGE_BINDING` | bind group 생성 시 validation error |
| 화면에 blit 할 텍스처 | `TEXTURE_BINDING` | blit 단계에서 에러 |
| CPU 로 읽어올 텍스처 | `COPY_SRC` | `copyTextureToBuffer` 에서 에러 |
| `copyTextureToBuffer` 대상 버퍼 | `COPY_DST \| MAP_READ` | mapAsync/copy 에서 에러 |
| weight/큰 배열 버퍼 | `STORAGE \| COPY_DST` | 셰이더에서 못 읽음 |

근거: `createStorageTexture` 는 `STORAGE_BINDING | TEXTURE_BINDING | COPY_SRC`, `readTextureRGBA` 의 readback 버퍼는 `COPY_DST | MAP_READ`, `createFeatureBuffer` 는 `STORAGE | COPY_SRC` 로 만듭니다.

---

## 4. out-of-bounds 좌표

GPU 는 dispatch 개수를 workgroup_size 의 배수로 **올림**하므로(`Math.ceil(width/8)`), 이미지 **밖**을 맡은 invocation 이 항상 생깁니다. 또 convolution 은 가장자리에서 이웃 픽셀이 이미지 밖을 가리킵니다.

| 증상 | 원인 | 해결 |
|------|------|------|
| 가장자리에 이상한 줄/노이즈 | 범위 밖 좌표를 그대로 읽음 | 셰이더 첫머리 `if (gid.x>=dims.x \|\| gid.y>=dims.y){return;}` (13장) |
| storage buffer 가 깨지거나 일부만 채워짐 | feature buffer 인덱스가 범위 밖 | 인덱스 `(y*width+x)*channels+c` 가 버퍼 길이 안인지 확인(`cnn.ts` 레이아웃) |
| 채널 경계에서 색이 섞임 | 채널 인덱스 `c` 가 `channels` 를 넘음 | conv 의 inC/outC 가 버퍼 채널 수와 일치하는지(`uploadConvLayer` 가 weight 길이 = `outC*inC*kh*kw` 검증) |

> 주의(rgba8 채널은 4개뿐): feature map 은 채널이 8개씩 되므로 `rgba8` 텍스처(채널 4)에 안 들어갑니다. 이 프로젝트는 `array<f32>` storage buffer + 명시적 인덱싱(`(y*width+x)*channels+c`)으로 다룹니다(`cnn.ts`). "채널이 섞여 보인다"면 텍스처에 억지로 담았는지 의심하세요.

---

## 5. 비동기 readback 함정

GPU 는 **비동기**입니다. 큐에 제출(`submit`)했다고 결과가 즉시 나오지 않습니다. CPU 로 값을 가져오려면 `mapAsync` 를 `await` 해야 합니다.

```ts
// src/core/texture.ts 의 readTextureRGBA 가 정확히 이 순서
device.queue.submit([encoder.finish()]);
await buffer.mapAsync(GPUMapMode.READ);   // ← 이 await 가 없으면 빈/옛 값
const data = new Uint8Array(buffer.getMappedRange());
```

| 증상 | 원인 | 해결 |
|------|------|------|
| `console.log(결과)` 가 0/빈 배열 | `await` 없이 읽음 | 호출부도 `const px = await readTextureRGBA(...)` 로 |
| 읽은 길이가 `width*height*4` 가 아님 | `bytesPerRow` 행 패딩 미제거 | `bytesPerRow=align(width*4,256)` 후 행별로 앞 `width*4` 만 추림 |
| `getMappedRange` 에서 에러 | unmap/destroy 누락 또는 두 번 map | 다 읽으면 `buffer.unmap()` → `buffer.destroy()` |

> 주의(maxAbsDiff 가 길이로 던지면 잘린 readback 신호다): `maxAbsDiff` 는 두 배열 길이가 다르면 **예외를 던집니다**(`src/math/color.ts`). 이건 버그가 아니라 안전장치입니다 — 행 패딩을 안 지운 잘린 readback 을 "작은 차이"로 잘못 통과시키지 않으려는 것. 길이 에러가 나면 5번 행 패딩부터 보세요.

---

## 6. CPU 비교로 정확성 검증 (maxAbsDiff)

"비슷해 보인다"는 검증이 아닙니다. 같은 연산을 `src/math/` 의 CPU 기준 구현으로도 계산해, GPU 결과와 **최대 절대 차이**를 잽니다.

```math
\text{diff} = \max_{p}\ \bigl| \text{CPU}(p) - \text{GPU}(p) \bigr|
```

```ts
const gpu = await readTextureRGBA(device, outTex, W, H);
const cpu = grayscale(srcPixels);            // src/math/color.ts 등 CPU 기준
console.log("maxAbsDiff =", maxAbsDiff(cpu, gpu));
```

판정 기준과 의미:

| diff 값 | 해석 | 다음 행동 |
|---------|------|-----------|
| 0~2 | 일치 (rgba8unorm 양자화 오차) | 정상. 통과 |
| 큰 값이 **전 영역** | 식/가중치 자체가 다름, 좌표계 전체 어긋남 | 셰이더 수식·dims 확인 |
| 큰 값이 **가장자리만** | out-of-bounds(4번) 또는 padding 처리 차이 | 범위 체크·convolution 경계 |
| 큰 값이 **음수 영역만** | CPU/GPU clamp 규약 불일치 | 양쪽 다 `clamp(.,0,1)`/0~255 로 통일(15장) |
| 길이 에러로 던짐 | 잘린 readback | 5번 행 패딩 제거 |

> 주의(clamp 규약을 양쪽에서 똑같이): GPU 가 `saturate(x)`(=`clamp(x,0,1)`)로 저장하면 CPU 비교도 **같은 0~255 clamp** 를 적용해야 합니다. 한쪽만 clamp 하면 음수/1초과 영역에서 maxAbsDiff 가 부풀려져 "버그처럼 보이는 정상"이 됩니다(15장 음수 클리핑).

---

## 7. navigator.gpu 없음 / device lost

GPU 초기화 단계의 두 가지 실패입니다. 둘 다 `src/core/webgpu.ts` 가 처리·로깅합니다.

| 증상 | 원인 | 해결 |
|------|------|------|
| 시작하자마자 "WebGPU 지원 안 함" 에러 | `navigator.gpu` 가 없음(미지원 브라우저/비보안 컨텍스트) | Chrome/Edge 113+, Safari 26+, Firefox 141+(Windows), `http://localhost` 또는 https 에서 열기 |
| "GPUAdapter 를 가져오지 못했습니다" | `requestAdapter()` 가 null | 하드웨어/드라이버 문제, 브라우저 플래그 확인 |
| 동작 중 갑자기 멈추고 콘솔에 `GPU device lost: ...` | device 가 죽음(드라이버 리셋, 너무 큰 dispatch, TDR 등) | 콘솔의 `reason`/`message` 확인, dispatch 크기·버퍼 크기 점검 후 device 재생성 |

```ts
// src/core/webgpu.ts — 두 실패를 미리 잡아 준다
if (!navigator.gpu) throw new Error("이 브라우저는 WebGPU 를 지원하지 않습니다. (navigator.gpu 가 없음)");
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("GPUAdapter 를 가져오지 못했습니다.");
const device = await adapter.requestDevice();
device.lost.then((info) => console.error(`GPU device lost: ${info.reason} - ${info.message}`));
```

> 주의(device lost 는 비동기 통지다): `device.lost` 는 Promise 입니다 — try/catch 로는 안 잡힙니다. `webgpu.ts` 가 이미 `.then` 으로 콘솔에 남기므로, "잘 되다가 갑자기 검은 화면 + 콘솔에 device lost" 패턴이면 코드 버그가 아니라 device 가 죽은 것입니다.

---

## 한눈에: 증상 → 어디를 볼까

| 증상 | 먼저 볼 곳 |
|------|-----------|
| 검은 화면 (에러 없음) | 1번 체크리스트(1·3·4·7) |
| 콘솔에 빨간 validation error | 3번 mismatch(@binding·usage·크기) |
| 셰이더 고쳤는데 반영 안 됨 | 2번 `getCompilationInfo()` |
| `console.log` 결과가 비어 있음 | 5번 비동기 readback `await` |
| 결과가 미묘하게/숫자로 다름 | 6번 maxAbsDiff(어느 영역인지) |
| 가장자리만 이상함 | 4번 out-of-bounds 좌표 |
| 시작부터 안 됨 / 갑자기 멈춤 | 7번 navigator.gpu / device lost |
</content>
</invoke>
