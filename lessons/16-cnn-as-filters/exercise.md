# 실습 16. CNN을 이미지 필터 관점에서 (개념 과제)

이 챕터는 **코드를 짜지 않습니다.** 1·2장처럼 개념을 손으로 풀어 보고 말로 설명하는 과제입니다. 종이나 메모장에 직접 적어 보세요 — 17장에서 이걸 그대로 WGSL 로 옮깁니다.

## 준비

- 실행할 것이 없습니다. `README.md` 를 먼저 읽고 시작하세요.
- 펜과 종이(또는 메모장)면 충분합니다. 수식은 외우는 게 아니라 **직접 적어 보며** 손에 익히는 것이 목적입니다.

## 과제 A. 15장 필터를 CNN 언어로 다시 적기

15장에서 직접 돌린 **edge kernel** 을 떠올리세요.

```math
K_{\text{edge}} = \begin{bmatrix} -1 & -1 & -1 \\ -1 & 8 & -1 \\ -1 & -1 & -1 \end{bmatrix}
```

1. 이 kernel 을 "왼쪽 위 → 오른쪽 아래" 순서로 **길이 9 벡터** $\mathbf{w}$ 로 펴서 적어 보세요.
2. 이 필터를 CNN 의 conv layer 로 본다면, **input channel** 수와 **output channel** 수는 각각 몇 개인가요? (15장은 luma 한 평면을 입력으로 받아 결과 한 장을 냈습니다.)
3. 15장에서는 이 9개 숫자를 **누가** 정했나요? CNN 이라면 **누가/무엇이** 정하나요? 한 문장으로 적어 보세요.
4. 이 layer 의 weight 행렬 $W$ 와 bias 벡터 $\mathbf{b}$ 의 크기(차원)를 적어 보세요. ($\mathbf{o} = W\mathbf{p} + \mathbf{b}$ 형태로.)

## 과제 B. RGB → 16채널 conv layer 의 크기 계산

17장에서 만들 첫 conv layer 는 **RGB(input channel 3) → feature map 16장(output channel 16)**, kernel $3 \times 3$ 입니다. 다음을 직접 계산해 적어 보세요.

1. 한 픽셀 위치에서 모으는 패치 벡터 $\mathbf{p}$ 의 **길이**는? (힌트: 입력채널 × kh × kw)
2. weight 행렬 $W$ 의 **크기**(행 × 열)는? 행 수와 열 수가 각각 무엇을 뜻하는지도 적어 보세요.
3. bias 벡터 $\mathbf{b}$ 의 **길이**는?
4. 이 layer 가 $256 \times 256$ 이미지를 처리한다면, 행렬-벡터 곱 $W\mathbf{p} + \mathbf{b}$ 를 **총 몇 번** 수행하나요? (힌트: 픽셀 위치마다 한 번.)
5. weight $W_{k,c}(i,j)$ 의 인덱스 4개 $(k, c, i, j)$ 가 각각 무엇을 가리키는지 한 줄씩 적어 보세요. 그리고 이 프로젝트의 export 레이아웃 `[outC][inC][kh][kw]` 와 어떻게 대응되는지 말해 보세요.

## 과제 C. 한 픽셀에서 layer 가 하는 일을 의사코드로

README "머릿속에 남길 그림"의 네 단계(패치 모으기 → $W\mathbf{p}$ → bias → ReLU)를, **자기 말로** 의사코드나 글로 적어 보세요. 다음을 반드시 포함하세요.

1. 패치 $\mathbf{p}$ 를 모을 때 **모든 입력 채널**을 가로지른다는 점(왜 $\sum_c$ 가 필요한지).
2. 출력 채널 $k$ 마다 **서로 다른** weight 벡터 $\mathbf{w}_k$ 로 내적한다는 점(왜 feature map 이 여러 장 나오는지).
3. ReLU 를 **원소별(element-wise)** 로 적용한다는 점, 그리고 $\mathrm{ReLU}(x) = \max(0, x)$.
4. (생각해 보기) 만약 ReLU 같은 activation 을 빼고 conv layer 만 여러 번 쌓으면, 전체가 결국 **하나의 선형 변환**으로 합쳐지는 이유를 한 문장으로 적어 보세요. (힌트: 선형 변환을 합성하면?)

## 과제 D. feature map 저장의 함정 예고 (생각해 보기)

17장 구현으로 넘어가기 전에 미리 짚는 함정입니다. 글로만 답해 보세요.

1. output channel 이 16개면 feature map 이 16장입니다. 이걸 `rgba8` 텍스처 한 장에 담을 수 있나요? 없다면 **왜** 없는지(텍스처 채널 수와 연결)를 적어 보세요.
2. conv 출력은 ReLU 를 거치기 **전**에 음수가 나올 수 있습니다. 이 중간 feature map 을 0~1 로 클램프되는 `unorm` 텍스처에 저장하면 무슨 문제가 생기나요? 어떤 포맷으로 저장해야 할까요? (README 의 `> 주의` 블록 참고.)
3. 그래서 17장은 16채널 feature map 을 **무엇으로** 다룰까요?

## 자가 점검 (README 와 동일 — 말로 설명해 보기)

1. 15장의 3x3 convolution 과 CNN 의 convolution layer 가 **무엇이 같고 무엇이 다른지** 설명해보세요. 특히 "kernel 값의 출처"와 "출력 채널(feature map) 개수" 두 축으로 답해보세요.
2. RGB(input channel 3) 입력에 출력 채널 16개짜리 $3 \times 3$ conv layer 에서 (a) 패치 벡터 $\mathbf{p}$ 의 길이, (b) weight 행렬 $W$ 의 크기, (c) bias 벡터 $\mathbf{b}$ 의 길이를 답하고, 한 출력 채널의 한 픽셀이 왜 "내적 + bias" 인지 $\mathbf{o} = W\mathbf{p} + \mathbf{b}$ 와 연결해 설명해보세요.
3. 이 챕터가 **학습이 아니라 추론만** 다루는 이유를 설명하고, 출력 채널 16개 feature map 을 `rgba8` 텍스처 한 장에 담을 수 없는 이유와 17장에서 무엇으로 다루는지도 말해보세요.

## 성공 기준

- 과제 A~D 를 보지 않고도 **남에게 말로 설명**할 수 있다(특히 "kernel 값이 학습된 weight 이고, filter 가 여러 개라 feature map 이 여러 장"이라는 한 문장).
- 과제 B 의 숫자(패치 길이 27, $W$ 는 $16 \times 27$, bias 길이 16)를 막힘없이 계산할 수 있다.
- $\mathbf{o} = \mathrm{ReLU}(W\mathbf{p} + \mathbf{b})$ 한 줄과 "모든 픽셀 위치에서 반복"이라는 그림이 머릿속에 또렷하다 — 이게 17~19장 전체의 building block 이다.

## 더 해보기 (선택)

- **18장 미리 그려 보기**: README 의 SRCNN 구조(`Conv 9x9 3→16 ReLU → Conv 1x1 16→16 ReLU → Conv 5x5 16→3`)에서, 각 layer 의 weight 행렬 $W$ 크기와 패치 벡터 $\mathbf{p}$ 길이를 과제 B 처럼 계산해 보세요. (예: conv1 의 $\mathbf{p}$ 길이는 $3 \times 9 \times 9 = 243$, $W$ 는 $16 \times 243$.)
- **1x1 conv 의 정체**: SRCNN 의 `Conv 1x1 16→16` 처럼 kernel 이 $1 \times 1$ 이면, 패치 $\mathbf{p}$ 는 "주변"이 없고 그 픽셀 자리의 16개 채널 값만 모은 길이 16 벡터입니다. 그러면 이 layer 는 픽셀마다 똑같은 **$16 \times 16$ 행렬-벡터 곱**이 됩니다. "주변을 안 보는 convolution = 채널 방향으로만 섞는 행렬 곱"이라는 점을 말로 설명해 보세요.
- **옵셔널 트랙 살짝 보기**: weight 가 "학습된 값"이라는 게 구체적으로 무슨 뜻인지 궁금하면, 옵셔널 트랙 O2(신경망 학습 기초)의 README 를 훑어보세요. 단, 메인 트랙 진행에는 필요 없습니다 — 추론만으로 18·19장까지 갑니다.
