# 실습 23. 성능 최적화 기초 (코드 읽기 + 손계산 과제)

이 챕터는 **새 코드를 짜지 않습니다.** 16장처럼 이미 구현된 코드를 성능의 눈으로 읽고, 비용을 손으로 계산하고, 말로 설명하는 과제입니다. 코드를 고치지 말고 **읽으며** 답을 찾으세요.

## 준비

- 실행할 것은 없지만, 원하면 `bun run dev 22`로 22장 데모를 띄워 stats 패널(`GPU 시간`, `스킵`)을 보며 답을 확인하세요.
- 읽을 파일(모두 읽기 전용):
  - `src/core/cnn.ts` — `uploadConvLayer`, `CnnRunner`(pipeline 생성, `uniformCache`, `dispatch`)
  - `src/core/blit.ts` — `Blitter.bindGroups` WeakMap
  - `src/core/pipeline.ts` — `dispatchSizeFor`
  - `lessons/22-realtime-sr-player/solution/main.ts` — setup vs 루프, `FRAME_BUDGET_MS`, `processing`
  - `src/core/gpu-timer.ts` — `measureGpuMs` (wall-clock 측정)

## 과제 A. conv 비용을 손으로 계산하기

원칙 1의 식 $\text{MAC}_{\text{layer}} = W\cdot H\cdot \text{outC}\cdot \text{inC}\cdot k_h\cdot k_w$를 그대로 써서 채워 보세요.

1. **SRCNN**(전부 HR $640\times480$, 즉 $W\cdot H = 307{,}200$)의 세 layer MAC을 각각 계산하세요.
   - conv1: 3→16, 9×9
   - conv2: 16→16, 1×1
   - conv3: 16→3, 5×5
   세 값을 더해 총합을 적고, **어느 layer가 비용의 대부분**인지와 그 이유(어느 항이 큰지)를 한 줄로 적으세요.
2. **FSRCNN**의 conv 5장은 LR $320\times240$($W\cdot H = 76{,}800$)에서 돕니다. extract(3→16, 5×5), shrink(16→8, 1×1), map1·map2(8→8, 3×3), expand(8→16, 1×1)의 MAC을 계산하고 더하세요. (deconv는 빼고 conv 5장만.)
3. 1번 SRCNN 총합과 2번 FSRCNN conv 5장 합을 비교하세요. **FSRCNN이 더 적은 결정적 이유**는 채널·kernel이 아니라 어느 항 때문인가요? (힌트: $W\cdot H$.)

## 과제 B. workgroup / dispatch 손계산

`dispatchSizeFor`와 `CnnRunner.dispatch`를 읽고 답하세요.

1. $640\times480$ 영역을 `[8,8]` workgroup으로 덮을 때, dispatch하는 workgroup 개수 (가로, 세로)를 `Math.ceil`로 계산하세요. 나누어떨어지나요?
2. 만약 폭이 $W=323$이라면 가로 workgroup 개수는? 그때 가로로 실제 띄워지는 invocation 수(개수×8)는 몇이고, **범위 밖**으로 버려지는 invocation은 몇 개인가요?
3. 3번의 "범위 밖 invocation"을 셰이더는 어떻게 처리해야 하나요? (좌표 체크 한 줄을 의사코드로 적어 보세요.)
4. (생각해 보기) `Math.ceil`을 `Math.floor`로 바꾸면 $W=323$에서 어떤 픽셀이 처리되지 않을까요? 화면에 어떤 증상으로 보일지 한 줄로 적으세요.

## 과제 C. "매 프레임 만들면 안 되는 것" 분류

22장 정답(`solution/main.ts`)을 읽고, 아래 객체들을 **(가) setup 1회** / **(나) 매 프레임** 두 칸으로 나눠 적으세요. 각각 그 칸에 둔 이유도 한 줄씩.

- `bilinearPipeline`
- `frameTex`, `hrTex`, `srOutTex`
- `sFeat0..sFeat3`, `fFeat0..fFeat6` (`createFeatureBuffer`)
- `uploadConvLayer` / `uploadDeconvLayer` 결과(layer 버퍼)
- `device.createCommandEncoder()`
- `copyVideoFrameToTexture`로 복사하는 **비디오 프레임 내용**

그리고 다음을 코드에서 찾아 인용(파일·줄 의미)하며 답하세요.

1. `CnnRunner` 생성자의 4개 pipeline은 (가)인가 (나)인가? 근거 줄을 적으세요.
2. `Blitter.bindGroups`가 `WeakMap`인 이유는? (텍스처가 버려질 때를 생각.)
3. `CnnRunner.uniformCache`(Map)는 어떤 key로 무엇을 재사용하나요? (`rgbToFeatures`/`featuresToRgb`의 key 문자열을 보세요.)

## 과제 D. 프레임 예산 초과 시나리오 (생각해 보기)

`FRAME_BUDGET_MS`와 `processing` 플래그, `onFrame`을 읽고 글로만 답하세요.

1. $1000/60 \approx 16.7$ms가 어디서 나온 숫자인지 한 줄로 적으세요.
2. GPU 한 프레임이 25ms 걸리는데 프레임 스킵을 **안 한다면** 어떤 일이 벌어지나요? (큐, 지연 관점.)
3. `processing`이 `true`인 동안 새 비디오 프레임이 오면 `onFrame`은 무엇을 하나요? 그게 2번의 문제를 어떻게 막나요?
4. 그래도 SRCNN이 계속 예산을 넘는다면, **모델 구조를 바꾸지 않는** 대응 두 가지와 **구조를 바꾸는** 대응 한 가지를 적으세요. (힌트: 원칙 1·6, FSRCNN 전환.)
5. (주의 연결) `measureGpuMs`는 `timestamp-query` 대신 `device.queue.onSubmittedWorkDone()`이 끝날 때까지 기다린 wall-clock 시간을 잽니다. 이 값이 GPU가 실제로 연산한 시간보다 크게 나오는 이유를 적고, `timestamp-query`로 재면 무엇이 달라지는지 한 줄로 적으세요.

## 자가 점검 (README와 동일 — 말로 설명해 보기)

1. conv layer 하나의 비용 $\text{MAC} = W\cdot H\cdot \text{outC}\cdot \text{inC}\cdot k_h\cdot k_w$를 쓰고, 이 식으로 FSRCNN이 SRCNN보다 빠른 이유를 ($W\cdot H$ 중심으로) 설명해보세요.
2. `workgroup_size`를 8×8로 고른 근거 두 가지, dispatch를 `Math.ceil`로 올림하는 이유, 범위 밖 invocation을 어디서 버리는지 설명해보세요.
3. "매 프레임 새로 만들어도 되는 객체"와 "절대 setup 밖에서 만들면 안 되는 객체"를 각각 들고, GPU 시간이 16.7ms를 넘을 때 `processing` 플래그가 하는 일을 설명해보세요.

## 성공 기준

- 과제 A의 숫자를 막힘없이 계산할 수 있다: SRCNN 총합 $\approx 1.64\text{G}$ MAC, FSRCNN conv 5장 합 $\approx 0.2\text{G}$ MAC, 그리고 "차이의 주범은 $W\cdot H$(HR vs LR, 4배)"라고 한 문장으로 말할 수 있다.
- 과제 C의 분류표를 보지 않고 다시 그릴 수 있고, "무거운 객체는 setup, 매 프레임은 command encoder뿐"이라는 한 줄을 말로 설명할 수 있다.
- "측정 먼저(GPU 시간), 그다음 최적화"와 "정확도를 파는 최적화(채널·kernel 축소)는 재학습·수치 비교가 필요하다"는 두 경고를 자기 말로 설명할 수 있다.

## 더 해보기 (선택)

- **deconv 비용도 계산**: FSRCNN deconv(16→3, 9×9, 출력 $640\times480$)의 대략적 MAC을 transposed conv의 입력 픽셀($320\times240$) 기준 $\text{MAC} \approx 76{,}800\times 3\times 16\times 81$로 추정해, 과제 A-2의 conv 5장 합에 더해 FSRCNN 전체($\approx 0.5\text{G}$)를 만들어 보세요. 여전히 SRCNN($1.64\text{G}$)보다 작은지 확인하세요.
- **separable 효과 가늠**: 만약 conv1의 $9\times9$를 $1\times9$ + $9\times1$로 분리할 수 있다면(원칙 1), 픽셀당 read가 $81$에서 $9+9=18$로 줄어듭니다. SRCNN conv1 MAC이 대략 몇 배 줄어드는지 비율로 적어 보세요. (단, 모든 kernel이 분리 가능한 건 아닙니다 — 왜 그런지도 한 줄.)
- **22장에서 직접 재 보기**: `bun run dev 22`로 SRCNN/FSRCNN을 전환하며 `GPU 시간`을 메모하고, 과제 A에서 계산한 MAC 비(약 3.3배)와 실제 시간 비가 비슷한지 비교해 보세요. (메모리 대역폭·고정 비용 때문에 정확히 일치하진 않습니다 — 그 차이가 왜 생기는지 생각해 보세요.)
