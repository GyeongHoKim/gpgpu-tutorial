# 실습 O1. PyTorch 환경과 tensor·autograd 기초

환경을 준비하고, tensor 와 autograd 를 직접 손으로 만져 보며 README 의 개념을 확인합니다. 코드는 짧고, 새 파일을 만들 필요 없이 `.venv/bin/python` 으로 한 줄씩 돌려도 됩니다.

## 준비

저장소 루트(`gpgpu-tutorial/`)에서 한 번만 실행합니다.

```bash
uv venv --python 3.12 .venv
VIRTUAL_ENV=.venv uv pip install torch numpy pillow
```

설치 확인:

```bash
.venv/bin/python -c "import torch; print(torch.__version__)"
```

> 주의: `python` 이 아니라 **`.venv/bin/python`** 입니다. 시스템 Python 으로 돌리면 "No module named 'torch'" 가 납니다.

## 과제

1. **디바이스 확인**
   사용 가능한 디바이스를 출력해 보세요. 학습 스크립트(O3)가 자동으로 고르는 그 디바이스입니다.
   ```bash
   .venv/bin/python -c "import torch; print('cuda', torch.cuda.is_available(), '| mps', torch.backends.mps.is_available())"
   ```
   - 셋(`cuda`/`mps`/`cpu`) 중 내 머신에서 무엇이 `True` 인지 적어 보세요.

2. **tensor 와 shape — 메인 트랙과 연결**
   다음을 만들어 각 `shape` 를 출력해 보세요.
   - 길이 3 벡터(WGSL `vec3f` 에 대응): `torch.tensor([0.2, 0.5, 0.9])`
   - $16 \times 27$ weight 행렬(16장의 $W$): `torch.randn(16, 27)`
   - conv weight tensor `[outC, inC, kh, kw] = [16, 3, 3, 3]`: `torch.randn(16, 3, 3, 3)`
   - 마지막 tensor 를 `reshape(-1)` 로 1차원(`Float32Array` 처럼)으로 펴고, 길이가 $16\times3\times3\times3$ 과 같은지 확인하세요.

3. **행렬-벡터 곱이 16장 그대로인지 확인**
   `p = torch.randn(27)`, `W = torch.randn(16, 27)`, `b = torch.randn(16)` 을 만들고 `o = W @ p + b` 를 계산해 `o.shape` 가 `[16]` 인지 확인하세요. 16장의 $\mathbf{o} = W\mathbf{p} + \mathbf{b}$ 와 같은 식임을 글로 한 줄 적어 보세요.

4. **autograd 로 gradient 자동 계산**
   `x = torch.tensor(3.0, requires_grad=True)` 로 시작해 `loss = x * x` 를 만들고 `loss.backward()` 후 `x.grad` 를 출력하세요.
   - 손으로 미분한 $\dfrac{dL}{dx} = 2x$ 값과 같은지 확인하고, 왜 그런지 한 줄로 설명하세요.

## 더 해보기 (선택)

- `x` 의 시작값을 바꿔(`2.0`, `5.0`) `x.grad` 가 항상 `2x` 인지 확인하세요.
- 손실을 `loss = x**3` 으로 바꾸면 gradient 가 `3*x**2` 가 되는지 확인하세요(미분 공식과 대조).
- `requires_grad=True` 를 빼면 `loss.backward()` 에서 무슨 일이 생기는지(왜 그런지) 관찰하세요.
- `torch` tensor 를 `.numpy()` 로 numpy 배열로 바꾸고 다시 `torch.from_numpy(...)` 로 되돌려, tensor↔numpy 가 같은 "숫자 묶음"임을 확인하세요.
- README 의 (b) 스니펫에서 `loss` 출력에 붙는 `grad_fn` 이 무엇을 뜻하는지(계산 그래프가 기록되는 중이라는 표시) 설명해 보세요.

준비가 끝나면 다음은 O2(신경망 학습 기초)에서 손실·gradient descent 의 수식을, O3 에서 이걸 SRCNN/FSRCNN 전체 학습 루프로 잇습니다.
