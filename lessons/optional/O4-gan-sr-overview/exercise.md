# 실습 O4. GAN 기반 SR 개요 (개념 정리)

이 챕터는 **개념 문서**라 채울 코드가 없습니다. 대신 "회사 GAN SR ↔ 우리 CNN 추론"의 연결을 **자기 말로 정리**하면 끝입니다. 아래 과제는 채점이 아니라, README 의 핵심 메시지를 스스로 재구성해 보는 용도입니다.

## 과제 1 — 한 문단으로 동료 설득하기

다음 상황을 가정하고 **3~5문장**으로 답을 적어 보세요.

> 옆 팀 동료가 "회사 SR 은 GAN 모델이라 우리가 18·19장에서 한 CNN 추론이랑은 완전히 다른 거 아니야?"라고 묻습니다.

답에 반드시 포함할 것:
- **GAN 은 학습 기법**이라는 점.
- 추론 때는 **Generator 만** 돌고 **Discriminator 는 버린다**는 점.
- 그 Generator 가 **우리가 한 conv 추론과 같은 종류**(규모만 큼)라는 점.

<details>
<summary>예시 답 (펼쳐서 비교)</summary>

다르지 않아. GAN 은 "어떻게 학습시켰나"에 대한 기법이야 — 학습 때 Generator 와 Discriminator 가 경쟁하면서 결과를 더 진짜처럼 만들 뿐이야. 추론할 때는 Discriminator 를 통째로 버리고 **Generator 하나만** LR→HR 로 한 번 돌려. 그 Generator 는 우리가 18·19장에서 쌓은 conv 스택이랑 같은 종류야 — conv·ReLU·학습된 확대(deconv/pixel-shuffle)의 반복이고, 단지 레이어가 훨씬 많고 채널이 넓을 뿐이야. 그래서 추론 파이프라인(LR→feature→conv→확대→RGB)은 우리 것과 같은 골격이고, 다른 건 **규모**뿐이야.
</details>

## 과제 2 — ESRGAN Generator 부품 매핑

ESRGAN Generator 의 구성요소를, 우리가 메인 트랙에서 이미 배운 것과 **1:1 로 짝지어** 표를 채워 보세요(README 3절의 표를 보지 말고 먼저 채운 뒤 비교).

| ESRGAN Generator 구성요소 | 우리가 배운 것 (몇 장에서?) |
|------|------|
| conv 3×3 layer | |
| ReLU / LeakyReLU | |
| residual 연결 | |
| 학습된 업샘플(pixel-shuffle) | |
| 마지막 conv → RGB | |

> 빈칸이 하나도 안 비면, "ESRGAN Generator = 더 깊은 CNN"이 말장난이 아니라는 걸 스스로 확인한 것입니다.

## 과제 3 — 계보 한 줄 요약

SRCNN/FSRCNN → SRGAN → ESRGAN → Real-ESRGAN 을 한 줄로 요약하되, **"바뀐 것"과 "그대로인 것"을 둘 다** 넣으세요.

- 바뀐 것(예): 학습 방법(MSE → GAN+perceptual), Generator 깊이·폭, 학습 데이터(깨끗 → 현실의 더러운 저화질).
- 그대로인 것(예): 추론은 항상 **Generator conv 스택 하나**, Discriminator 는 추론에 안 씀.

## 더 해보기 (선택) — 회사 모델로 가는 길 점검

README 5절의 "다음 학습 방향"을 보고, **지금 당장 가장 먼저 확인해야 할 것**을 하나 골라 이유를 적어 보세요.
힌트: 회사 모델을 우리 추론 엔진에 올리려면, 코드보다 먼저 **그 모델의 레이어 스펙(커널·채널·업샘플 방식)** 과 **weight 레이아웃**을 알아야 합니다(19장 deconv 의 `[inC][outC][kh][kw]` vs conv 의 `[outC][inC][kh][kw]` 차이를 떠올리세요).

## 정리

이 챕터의 목표는 코드가 아니라 **두려움 제거**입니다. "회사는 GAN SR 을 쓴다"는 문장을 들었을 때, 그것을 **"학습된 큰 conv Generator 를 추론한다 = 우리가 한 일의 큰 버전"** 으로 번역할 수 있으면 이 챕터는 성공입니다.
