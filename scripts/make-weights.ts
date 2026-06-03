// checkpoint -> weights.ts 변환 스크립트 (CNN 챕터에서 사용).
//
// 메인 트랙은 학습을 하지 않고 "변환만" 한다. (Python 불필요)
// 미리 학습된 model/srcnn.checkpoint, model/fsrcnn.checkpoint 를 읽어,
// storage buffer 레이아웃([outC][inC][kh][kw] + bias)에 맞춘
// lessons/18-.../model/srcnn-weights.ts, lessons/19-.../model/fsrcnn-weights.ts 로 내보낸다.
//
// 18·19장 작업 시 실제 변환 로직을 구현한다.

import { existsSync } from "node:fs";

const checkpoints = ["model/srcnn.checkpoint", "model/fsrcnn.checkpoint"];
const missing = checkpoints.filter((p) => !existsSync(p));

if (missing.length > 0) {
  console.log(`아직 다음 checkpoint 가 없습니다: ${missing.join(", ")}`);
  console.log("CNN 챕터(18 SRCNN, 19 FSRCNN)를 만들 때 checkpoint 와 변환 로직을 추가합니다.");
  console.log("옵셔널 트랙(O3)에서 직접 학습해 이 checkpoint 를 만들 수도 있습니다.");
  process.exit(0);
}

// TODO(18·19장): checkpoint 를 읽어 각 lesson 의 model/*-weights.ts 로 변환.
console.log("make:weights — 변환 로직은 SRCNN/FSRCNN 챕터에서 구현됩니다.");
