#!/usr/bin/env bash
# 비디오 챕터(20~22)용 샘플 영상을 ffmpeg 로 생성한다.
#
# 영상 자체는 용량이 있어 git 에 넣지 않는다(.gitignore 의 public/videos/). 이 스크립트만 git 에 둔다.
# 합성 패턴(testsrc2: 선명한 에지·텍스트·움직이는 요소)이라 라이선스 이슈가 없고 재현 가능하다.
# 저해상도(320x240)로 만들어 Super Resolution 2x 확대 효과가 잘 보이게 한다.
#
# 사용: bash scripts/make-sample-video.sh

set -euo pipefail

OUT_DIR="public/videos"
OUT="$OUT_DIR/sample.mp4"
mkdir -p "$OUT_DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg 가 필요합니다. (macOS: brew install ffmpeg)" >&2
  exit 1
fi

echo "샘플 영상 생성: $OUT (320x240, 15fps, 8초)"
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=320x240:rate=15" \
  -t 8 -pix_fmt yuv420p -c:v libx264 -movflags +faststart \
  "$OUT"

echo "완료: $OUT"
echo "(브라우저 호환을 위해 H.264/yuv420p. 20~22장에서 <video src=\"...\"> 로 사용)"
