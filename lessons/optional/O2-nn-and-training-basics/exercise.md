# 실습 O2. 신경망 학습 기초 (개념 정리)

이 챕터는 **코드를 짜지 않습니다.** 16장처럼 그림·수식으로 개념을 다지는 챕터라, 실습도 **연필과 종이(또는 메모)** 로 하는 개념 정리입니다. 여기서 정리한 loss / gradient descent / epoch·batch·lr 개념을, 바로 다음 **O3 에서 PyTorch 코드로 직접 돌립니다.**

목표: "남이 정리해 둔 걸 읽었다"가 아니라 **내 문장으로 설명할 수 있다** 가 되는 것. 아래 과제는 모두 "써 보거나 말로 설명해 보는" 것입니다.

## 과제 1. MSE loss 직접 계산해 보기 (손계산)

아주 작은 예로 loss 가 "틀린 정도를 숫자 하나로 잰다"를 체감합니다. 1차원(흑백) 픽셀 3개짜리 이미지라고 합시다.

- 정답 $y = [0.8,\ 0.2,\ 0.5]$
- 모델 예측 $\hat{y} = [0.6,\ 0.2,\ 0.9]$

다음을 직접 계산하세요.

1. 각 픽셀의 오차 $\hat{y}_i - y_i$ 세 개.
2. 그 제곱 $(\hat{y}_i - y_i)^2$ 세 개.
3. MSE loss $\mathcal{L} = \frac{1}{N}\sum_{i=1}^{N}(\hat{y}_i - y_i)^2$ (여기서 $N = 3$).
4. 만약 예측이 정답과 **완전히 같다면** loss 는 얼마인가요? 왜 그게 "가장 좋은" 값인가요?
5. 두 번째 픽셀(오차 0)과 세 번째 픽셀(오차 0.4) 중 어느 쪽이 loss 에 더 크게 기여하나요? **제곱**이 그 차이를 어떻게 더 벌리는지 한 문장으로 설명하세요.

> 확인: $\mathcal{L} = \frac{1}{3}\big((-0.2)^2 + 0^2 + (0.4)^2\big) = \frac{0.04 + 0 + 0.16}{3} \approx 0.0667$.

## 과제 2. gradient descent 한 걸음을 손으로

변수 하나짜리 아주 단순한 loss $\mathcal{L}(\theta) = (\theta - 3)^2$ 를 생각합시다. (이 loss 를 최소로 만드는 $\theta$ 는 분명히 $3$ 입니다 — 우리는 그걸 "안다"고 치고, gradient descent 가 거기로 가는지 봅니다.)

1. 미분해서 gradient $\nabla_\theta\mathcal{L} = \dfrac{d\mathcal{L}}{d\theta}$ 를 $\theta$ 의 식으로 쓰세요. (힌트: $\frac{d}{d\theta}(\theta-3)^2$)
2. 지금 $\theta = 0$, learning rate $\eta = 0.1$ 이라 합시다. 갱신식 $\theta \leftarrow \theta - \eta\nabla_\theta\mathcal{L}$ 로 **한 걸음** 간 뒤의 $\theta$ 값을 계산하세요.
3. 그 새 $\theta$ 로 **한 걸음 더** 가 보세요. $\theta$ 가 $3$ 에 **가까워지나요?**
4. 이번엔 $\eta = 2.0$ (너무 큰 보폭)으로 $\theta = 0$ 에서 한 걸음, 두 걸음 가 보세요. $\theta$ 가 $3$ 으로 모이나요, 아니면 점점 **멀어지나요(발산)?** 이 결과를 README 의 "learning rate 가 너무 크면 발산" 주의와 연결해 설명하세요.

> 이 과제의 핵심: gradient 의 **반대 방향**으로 가면 loss 가 줄고($\eta$ 가 적당할 때), $\eta$ 가 너무 크면 골짜기를 건너뛰어 **발산**한다는 것을 숫자로 확인하는 것.

## 과제 3. O3 학습 루프 코드 읽고 표 채우기 (코드 실행 없음)

다음 챕터 O3 의 `train_srcnn.py` 학습 루프를 (실행하지 말고) 읽어 보세요.

```python
EPOCHS = 60
BATCH  = 16
opt   = torch.optim.Adam(model.parameters(), lr=1e-3)
sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS, eta_min=1e-5)

for epoch in range(EPOCHS):
    for lr, hr in dl:
        pred = model(lr_up)
        loss = F.mse_loss(pred, hr)
        opt.zero_grad()
        loss.backward()
        opt.step()
    sched.step()
```

아래 표를 "이 코드의 어느 줄/값이 그 개념인가"로 채우세요.

| 개념 | 정의(한 문장, 내 말로) | 이 코드에서 어디? |
|---|---|---|
| loss function | | |
| gradient descent 한 걸음 | | |
| learning rate $\eta$ | | |
| batch | | |
| epoch | | |

추가 질문:

1. 안쪽 `for lr, hr in dl:` 한 바퀴가 gradient descent **한 걸음**인 이유는? (한 걸음에 무엇이 일어나는지 `pred → loss → backward → step` 순서로 말하기)
2. `loss.backward()` 와 `opt.step()` 은 README 의 수식 $\theta \leftarrow \theta - \eta\nabla_\theta\mathcal{L}$ 중 각각 어느 부분을 담당하나요?
3. `sched.step()` 이 epoch 끝마다 하는 일(CosineAnnealingLR)은 무엇이며, learning rate 를 그렇게 **점점 줄이는** 이유를 "보폭" 비유로 설명하세요.

## 과제 4. 메인 트랙과 연결해 말로 설명 (말하기)

다음 한 문단을, 16장과 이 챕터 내용을 묶어 **누군가에게 설명하듯** 소리 내어(또는 글로) 정리하세요.

> "메인 트랙 18·19장 데모가 쓰는 weight $W$, $\mathbf{b}$ 는 어디서 왔는가? 그리고 왜 메인 트랙은 학습을 하지 않고 추론만 하는가?"

설명에 아래 세 가지를 **반드시 포함**하세요.

- 16장 식 $\mathbf{o} = W\mathbf{p} + \mathbf{b}$ — 메인 트랙이 추론에서 계산하는 것.
- O2 의 사이클 — loss 재고 → $\nabla_\theta\mathcal{L}$ 의 반대로 $W$ 를 조금씩 갱신 → 반복.
- 15장 → 16장 → O2 → O3 → 18·19장 의 흐름 (kernel 을 사람이 적음 → 학습된 weight 로 부름 → gradient descent 로 찾음 → PyTorch 로 실제 학습·저장 → GPU 로 추론).

## 더 해보기 (선택, 여전히 코드 없음)

- **overfitting 직관**: 학습 데이터의 loss 를 0 까지 밀어붙였는데 **처음 보는 영상**에선 결과가 나빠지는 상황을, 시험 공부에 비유해 설명해 보세요(기출만 통째로 외운 학생 vs 원리를 이해한 학생).
- **다른 loss 상상**: MSE 대신 L1(절댓값 오차 $\frac1N\sum|\hat y - y|$)을 쓰면, 큰 오차에 대한 벌점이 어떻게 달라질지 제곱 그래프와 절댓값 그래프를 떠올려 비교해 보세요. (O3 의 "더 해보기"에서 실제로 `F.l1_loss` 로 바꿔 보게 됩니다.)
- **준비 운동**: O3 를 위해 `uv venv` 로 PyTorch 가상환경을 미리 만들어 두세요(O3 README "실행 방법" 0단계). 이 챕터에서 정리한 개념이 그 코드 어디에 있는지 찾으며 읽으면 O3 가 훨씬 쉽습니다.
