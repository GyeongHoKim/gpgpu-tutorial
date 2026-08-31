# 실습 O3. SRCNN / FSRCNN 학습

제공된 스크립트로 두 모델을 학습하고, 결과를 메인 트랙에 연결합니다.

## 준비

```bash
uv sync
bash scripts/download-div2k.sh   # Windows 는 Git Bash 에서 실행
```

## 과제

1. **두 모델 학습**
   ```bash
   uv run lessons/optional/O3-train-srcnn-fsrcnn/train_srcnn.py
   uv run lessons/optional/O3-train-srcnn-fsrcnn/train_fsrcnn.py
   ```
   epoch마다 loss가 줄어드는지 확인하세요. (환경변수 `EPOCHS`, `BATCH`로 조절)

2. **export + 연결**
   ```bash
   uv run lessons/optional/O3-train-srcnn-fsrcnn/export_checkpoint.py
   bun run make:weights
   ```

3. **확인**: 18·19장 데모를 열어 내가 학습한 weight로 동작하는지 본다.

## 더 해보기 (선택)

- `models.py`에서 채널 수를 늘려(예: SRCNN 16→32) 품질 변화를 관찰하세요. (단, 메인 트랙 셰이더의 채널 수도 함께 맞춰야 합니다 — `model/architecture.md` 갱신)
- `EPOCHS`를 늘리거나 정식 train 세트(`download-div2k.sh train`)로 학습해 품질을 비교하세요.
- FSRCNN의 deconvolution을 "bilinear 확대 + conv"로 바꾸면 checkerboard artifact가 어떻게 달라지는지 실험하세요.
- 손실을 MSE 대신 L1(`F.l1_loss`)으로 바꿔 결과를 비교하세요.
