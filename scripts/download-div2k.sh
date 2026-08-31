#!/usr/bin/env bash
# DIV2K Super-Resolution 데이터셋 다운로드 스크립트.
#
# 데이터셋 자체는 용량이 커서 git 에 넣지 않는다(.gitignore 의 data/). 이 스크립트만 git 에 둔다.
# DIV2K 는 NTIRE 챌린지의 공개 데이터셋으로 학술/교육용으로 자유롭게 사용할 수 있다.
# 출처: https://data.vision.ee.ethz.ch/cvl/DIV2K/
#
# 사용:
#   bash scripts/download-div2k.sh            # 기본: valid HR (100장, ~430MB) — 빠른 시작용
#   bash scripts/download-div2k.sh train      # train HR (800장, ~3.5GB) — 정식 학습용
#   bash scripts/download-div2k.sh both       # 둘 다
#
# tiny 교육용 모델에는 valid(100장)만으로도 충분하다. 정식 학습은 train 을 쓴다.

set -euo pipefail

BASE_URL="https://data.vision.ee.ethz.ch/cvl/DIV2K"
DEST="data/div2k"
WHICH="${1:-valid}"

mkdir -p "$DEST"

download_and_unzip() {
  local name="$1"            # 예: DIV2K_valid_HR
  local zip="$DEST/$name.zip"
  local dir="$DEST/$name"

  if [ -d "$dir" ]; then
    echo "이미 있음: $dir (건너뜀)"
    return
  fi
  if [ ! -f "$zip" ]; then
    echo "다운로드: $name.zip"
    curl -L --fail -C - -o "$zip" "$BASE_URL/$name.zip"
  fi
  echo "압축 해제: $name.zip"
  unzip -q "$zip" -d "$DEST"
  echo "완료: $dir"
}

case "$WHICH" in
  valid) download_and_unzip "DIV2K_valid_HR" ;;
  train) download_and_unzip "DIV2K_train_HR" ;;
  both)
    download_and_unzip "DIV2K_train_HR"
    download_and_unzip "DIV2K_valid_HR"
    ;;
  *)
    echo "사용법: bash scripts/download-div2k.sh [valid|train|both]" >&2
    exit 1
    ;;
esac

echo ""
echo "DIV2K 준비 완료. 학습: uv run lessons/optional/O3-train-srcnn-fsrcnn/train_srcnn.py"
