# AGENTS.md

이 파일은 이 저장소에서 작업하는 모든 에이전트(및 사람)가 따라야 하는 **교육 콘텐츠 작성 규약**입니다. 코드 규약뿐 아니라, 이 튜토리얼이 "신입 교육용"이라는 목적에서 나오는 글쓰기·시각자료·수식 규칙을 정의합니다. 챕터를 만들거나 문서를 쓸 때 이 규약을 먼저 읽고 그대로 따르세요.

## 이 프로젝트가 무엇인가

IDIS Pylon 파트의 신입 웹 개발자가 WebGPU와 WGSL을 단계적으로 익혀, 최종적으로 비디오 플레이어용 최소 CNN Super Resolution 데모를 직접 구현하게 만드는 튜토리얼입니다. 전체 계획은 `README.md`를 참고하세요.

핵심은 두 트랙입니다.

- **메인 트랙 (`lessons/`)**: WebGPU/WGSL 쉐이더 프로그래밍과 GPU 추론. Python 불필요.
- **옵셔널 트랙 (`lessons/optional/`)**: PyTorch와 신경망 학습. 메인 트랙에서 쓰는 weight를 직접 만든다.

## 대상 독자 (가장 중요한 전제)

작성하는 모든 글의 기준 독자는 **갓 대학을 졸업한 신입 개발자**입니다.

- TypeScript 기본 문법은 안다. HTML/CSS/`<canvas>`/`<video>`는 써봤다.
- **GPU 프로그래밍, 셰이더, 딥러닝 경험은 전혀 없다.**
- **선형대수학·미적분 같은 수학 개념은 대학에서 배워 아직 기억에 남아 있다.** → 이걸 적극적으로 활용한다. 벡터, 행렬, 내적(dot product), 행렬-벡터 곱은 "이미 아는 것"으로 간주하고 거기서 출발해 설명한다. 새 개념(convolution, CNN)을 항상 **이미 아는 선형대수 언어로 먼저 번역**해준다.

글을 쓸 때 자문: "선형대수를 막 배운 4학년이 이 문장을 읽고 이해할까? 새로 나온 용어를 내가 정의 없이 던지지 않았나?"

## 작성 규약 (반드시 지킬 것)

### 1. 수식은 KaTeX로, 자세히

- 행렬 연산·신경망·convolution 등 수학이 필요한 곳에는 **반드시 수식을 넣는다.** 말로만 때우지 않는다.
- 수식은 **KaTeX 문법**으로 쓴다. GitHub과 VS Code(Markdown Preview Enhanced 확장)에서 렌더링된다.
  - 인라인: `$ ... $`
  - 블록: ` ```math ` 코드펜스 사용 (GitHub에서 `$$`보다 안전)
- 수식을 던지고 끝내지 말고 **항상 기호를 풀어서 설명**한다. 예: "$W \in \mathbb{R}^{8 \times 3}$ 는 출력 채널 8개 × 입력 채널 3개짜리 weight 행렬이다."
- **선형대수와 연결**: 새 연산을 소개할 때 가능한 한 익숙한 형태로 환원한다.
  - convolution → "각 출력 픽셀은 주변 픽셀 벡터와 kernel 벡터의 **내적**이다."
  - CNN conv layer → "$\text{out} = W \cdot \text{in} + b$ 형태의 **행렬-벡터 곱 + bias**를, 모든 픽셀 위치에서 반복하는 것."
  - ReLU → "$\max(0, x)$ 를 원소별(element-wise)로 적용."
- 예시 (그대로 따라 할 형식):

  3×3 convolution은 이미 아는 내적입니다. 출력 픽셀 $O(x, y)$ 는 입력의 $3 \times 3$ 이웃과 kernel $K$ 의 내적입니다.

  ```math
  O(x, y) = \sum_{i=-1}^{1} \sum_{j=-1}^{1} I(x+i,\ y+j)\, K(i, j) + b
  ```

  여기서 $I$ 는 입력 이미지, $K$ 는 $3 \times 3$ kernel, $b$ 는 bias(상수)입니다. 9개 곱을 더하는 것이므로, $3 \times 3$ 패치를 길이 9 벡터로 펴면 그냥 두 벡터의 내적 $\langle \mathbf{i}, \mathbf{k} \rangle + b$ 입니다.

### 2. 시각자료는 필수

- 개념 설명 챕터/문서에는 **반드시 시각자료를 넣는다.** 텍스트만 있는 개념 설명은 미완성으로 본다.
- 시각자료는 다음 세 가지를 **상황에 맞게 적극적으로 모두 활용**한다. 우선순위로 줄 세우지 말고, 설명에 가장 효과적인 것을 쓴다.
  - **외부 이미지 (적극 활용)**: Wikipedia/Wikimedia Commons 등에서 좋은 자료(예: convolution 애니메이션, CNN 구조도, 색공간 다이어그램)를 **`curl`로 직접 받아** `docs/assets/external/`에 저장해 사용한다. 잘 만들어진 표준 그림은 직접 그리는 것보다 낫다.
    - 받을 때 **반드시 `docs/assets/CREDITS.md`에 파일명·출처 URL·저작자·라이선스를 기록**한다 (아래 형식).
    - 라이선스를 확인한다: CC0 / Public Domain / CC BY / CC BY-SA는 사용 가능(표기 필수, CC BY-SA는 원본을 가공하지 말 것). **비자유(fair-use) 이미지(로고·포스터·앨범커버 등)는 금지.**
    - 받기 예시: `curl -L -o docs/assets/external/conv.gif "<wikimedia-file-url>"`
  - **직접 그린 다이어그램**: 텍스트 다이어그램, Mermaid, SVG. 우리 파이프라인·메모리 레이아웃처럼 외부에 딱 맞는 그림이 없을 때, 또는 우리 코드 구조를 그릴 때 사용. 라이선스 자유.
  - **코드로 생성하는 시각화**: 캔버스에 그린 결과, before/after 비교 등 실제 산출물.
- CREDITS 기록 형식:

  ```markdown
  - `external/conv.gif` — Author: Jane Doe, Source: https://commons.wikimedia.org/wiki/File:...,
    License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
  ```
- **Mermaid**는 GitHub/VS Code에서 렌더링되므로 파이프라인·흐름도에 적극 사용한다. 예:

  ```mermaid
  flowchart LR
    A[video frame] --> B[GPU texture] --> C[compute shader] --> D[canvas]
  ```
- 텍스트 다이어그램(ASCII)도 좋다. 특히 메모리 레이아웃, 텍스처 좌표, 픽셀 그리드 설명에 유용하다.
- "완성되면 이런 화면" 스크린샷 자리를 각 실습 챕터에 둔다(이미지는 직접 캡처해 `docs/assets/`에 넣고 CREDITS 불필요 — 우리 산출물).

### 3. 챕터 문서 구조 (모든 lesson README가 동일하게)

각 `lessons/*/README.md`는 다음 순서를 따른다.

1. **학습 목표** (2~3줄): 이 챕터를 마치면 무엇을 할 수 있는가.
2. **예상 소요 시간 + 난이도** (예: 약 40분 · ★★☆☆☆).
3. **사전 지식**: 앞선 어떤 챕터/개념이 필요한가.
4. **개념 설명**: 시각자료 + 필요한 수식(KaTeX) 포함. 새 용어는 처음 나올 때 정의.
5. **완성되면 이런 화면**: 기대 결과 스크린샷/설명.
6. **자가 점검 질문 3개**: 독자가 스스로 설명해봐야 하는 질문 (정답이 아니라 "설명할 수 있는가"를 묻는다). 예: "workgroup_size를 8×8로 정한 이유를 설명해보라."

`lessons/*/exercise.md`는 신입이 직접 채울 과제를, `src/`는 TODO가 있는 골격 코드를, `solution/`은 완성 코드를 담는다.

### 4. 글쓰기 톤

- 언어: **한국어**. 코드 식별자·표준 용어는 영어 그대로(예: compute shader, workgroup, texture). 한국어로 억지 번역하지 않는다.
- 처음 나오는 영어 용어는 짧게 한국어로 풀어준다. 핵심 용어는 `docs/glossary.md`에 한영 대조로 모은다.
- "딥러닝"으로 겁주지 않는다. convolution을 먼저 **이미지 필터**로 이해시키고, CNN을 "필터 값이 학습된 것"으로 확장한다 (README의 핵심 학습 원칙 참고).
- 추론(inference)만 다룬다는 점을 분명히 한다. 학습은 옵셔널 트랙으로 미룬다.

### 5. 신입이 자주 막히는 지점은 미리 경고

설명 중 해당 함정이 나오면 `> 주의:` 블록으로 그 자리에서 경고한다. 대표 함정:

- **GPU는 비동기다**: 큐에 넣었다고 끝난 게 아니다. 결과 읽기는 `mapAsync` 등 비동기. "console.log가 안 찍혀요"의 주원인.
- **버퍼 정렬(alignment)**: `vec3f`는 16바이트 정렬. weight/uniform 데이터를 `Float32Array`로 채울 때 패딩을 맞춰야 한다.
- **좌표계 Y 뒤집힘**: canvas/video 원점과 텍스처 좌표 관례가 달라 결과가 상하 반전될 수 있다.
- **feature map 채널 저장**: `rgba8` 텍스처는 채널 4개뿐. 8채널 feature map은 storage buffer나 텍스처 여러 장으로 다룬다 (이 프로젝트는 storage buffer + 명시적 인덱싱을 기본으로).
- **음수 값 클리핑 (feature map/중간 결과)**: conv 출력이나 중간 feature map은 음수가 나올 수 있다(특히 ReLU 이전). `unorm` 텍스처(0~1 클램프)에 저장하면 잘린다. 중간 결과는 `r32float`/float storage 로. SRCNN/FSRCNN 의 중간 feature map 모두 해당.

## 코드·스택 규약

- **언어**: TypeScript. Bun이 빌드 스텝 없이 바로 실행.
- **런타임/패키지/테스트/번들러**: Bun. (`bun install`, `bun test`, `bun run dev`)
- **UI**: 네이티브 Web Component (`customElements`)만. Lit 등 라이브러리 금지. `src/ui/` 컴포넌트는 미리 완성해 제공하고, 신입은 가져다 쓰기만 한다.
- **GPGPU**: WebGPU + WGSL 직접 작성. tgpu 등 GPGPU 라이브러리 금지 (쉐이더 학습이 목적).
- **WGSL 로딩**: 표준 import attributes 사용. `?raw`(Vite 전용) 쓰지 않는다.
  ```ts
  import code from "./shaders/x.wgsl" with { type: "text" };
  device.createShaderModule({ code });
  ```
  초반 챕터는 인라인 템플릿 리터럴(`` /* wgsl */ `...` ``)로 "쉐이더는 문자열"을 먼저 체감시킨 뒤, 이후 파일로 분리한다.
- **공통 코드 재사용**: WebGPU 초기화·텍스처·버퍼·파이프라인·blit·UI는 `src/`의 공통 모듈을 쓴다. 챕터마다 중복 구현하지 않는다.
- **CPU 먼저 → GPU → 비교**: 가능한 기능은 `src/math/`에 CPU 기준 구현을 두고 `bun test`로 검증한 뒤, GPU 버전과 수치 비교(max abs diff)한다. "눈으로 비슷"이 아니라 숫자로 비교한다.

## 검증

- CPU 수학/이미지 로직: `bun test`로 자동 검증 (`tests/cpu/`).
- 셰이더/파이프라인 코드: `bun build`로 번들/구문 검증.
- 실제 GPU 동작: 브라우저에서 직접 확인 (이 부분은 자동 검증 불가 — 변경 후 브라우저 확인 필요함을 명시).

## 작업 진행 원칙 (멀티 에이전트)

- 공통 기반과 "파일럿 챕터(정답 패턴)"를 먼저 고정한 뒤, 나머지 챕터를 의존성 순서대로 만든다. 기반 없이 챕터를 병렬로 만들지 않는다.
- 챕터를 만들 때는 이 CLAUDE.md + 확정된 공통 모듈 + 파일럿 챕터의 형식을 그대로 따른다. 새 규약을 임의로 만들지 않는다.
- 한 챕터에서 설명하는 개념은 반드시 같은 폴더 안에서 실행 가능한 코드로 확인할 수 있어야 한다.

## 커밋 메시지 규약 (Conventional Commits)

모든 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식을 따른다.

형식:

```text
<type>(<scope>): <설명>

<본문 — 선택. 무엇을, 왜>

<footer — 선택>
```

- **type** (필수): 아래 중 하나.
  - `feat`: 새 기능/챕터/모듈 추가
  - `fix`: 버그 수정
  - `docs`: 문서만 변경 (README, CLAUDE.md, lesson 문서 등)
  - `refactor`: 동작 변화 없는 코드 구조 변경
  - `perf`: 성능 개선
  - `test`: 테스트 추가/수정
  - `build`: 빌드·의존성·도구 변경 (package.json, bunfig, tsconfig 등)
  - `chore`: 그 외 잡무 (스크립트, 설정 등)
  - `ci`: CI 설정 변경
- **scope** (선택): 변경 범위. 예: `core`, `ui`, `lesson-13`, `optional`, `model`. 없으면 생략.
- **설명** (필수): 한국어, 명령형/요약형, 마침표 없이 간결하게. 무엇을 했는지.
- **본문** (선택): 큰 변경은 불릿으로 무엇·왜를 적는다. 한국어.
- **breaking change**: 호환성 깨짐은 `type!:` 또는 footer 에 `BREAKING CHANGE:` 명시.
- **footer**: 에이전트가 만든 커밋은 메시지 끝에 항상 `Co-Authored-By: Claude <noreply@anthropic.com>` 를 붙인다. 모델 이름이나 버전은 적지 않는다. 모델은 계속 바뀌는데 규약에 특정 버전을 박아 두면 금세 사실과 어긋나기 때문이다.
