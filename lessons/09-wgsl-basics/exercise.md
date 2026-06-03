# 실습 9. WGSL 기본 문법

이 챕터의 실습은 두 부분입니다. **(A) `shaders/basics.wgsl`을 읽고 이해하기**가 핵심이고, **(B) `src/main.ts`의 보일러플레이트를 채워** 그 셰이더를 실제로 돌려 화면에 띄웁니다.

## 준비

```bash
bun install        # 처음 한 번
bun run dev 9      # 9장 개발 서버 (http://localhost:5173)
```

WebGPU 지원 브라우저(Chrome/Edge 최신)로 엽니다.

## A. 셰이더 읽기 (먼저 할 것)

`shaders/basics.wgsl`을 열고, README의 "개념 설명"을 옆에 두고 다음을 직접 짚어보세요. (코드를 고치는 게 아니라 **읽는** 과제입니다.)

1. `let`으로 선언된 변수와 `var`로 선언된 변수를 각각 찾으세요. `color`는 왜 `var`인가요?
2. `f32`, `i32`, `u32`, `bool`, `vec2u`, `vec2f`, `vec3f`, `vec4f`가 쓰인 줄을 하나씩 찾으세요.
3. **타입 변환**이 일어나는 줄을 모두 찾으세요(`vec2f(...)`, `i32(...)` 등). 각 변환이 "어떤 타입 → 어떤 타입"인지 적어보세요.
4. 사용자 정의 함수 `gradientColor`와 `vignette`의 매개변수 타입·반환 타입을 적어보세요.
5. `i32(gid.x) / 32`가 **정수 나눗셈**이라는 점을 확인하고, 이게 왜 체커보드 칸 번호를 만드는지 설명해보세요.

## B. 보일러플레이트 채우기

`src/main.ts`의 1)번(초기화)은 되어 있습니다. 다음 TODO를 순서대로 채우세요. (모두 `@core/*` 헬퍼만 씁니다)

1. **출력 텍스처**
   - `const outputTex = createStorageTexture(device, WIDTH, HEIGHT);`

2. **pipeline + bind group**
   - `const pipeline = createComputePipeline(device, basicsShader);`
   - bind group entries: `binding 0` = 출력 텍스처 `.createView()` **하나뿐** (이 셰이더는 입력 텍스처가 없습니다)

3. **dispatch**
   - `const [gx, gy] = dispatchSizeFor(WIDTH, HEIGHT, [8, 8]);`
   - command encoder → `beginComputePass()` → `setPipeline` → `setBindGroup(0, ...)` → `dispatchWorkgroups(gx, gy)` → `end()` → `device.queue.submit([encoder.finish()])`

4. **화면 출력**
   - `const blitter = new Blitter(device, format);`
   - `blitter.blit(context, outputTex);`

## 성공 기준

- 캔버스에 그라데이션 + 원형 음영 + 옅은 체커보드가 합쳐진 이미지가 나온다.
- stats 패널에 `dispatch`가 `32×32`로 표시된다.

## 더 해보기 (선택)

`basics.wgsl`을 직접 고쳐 문법을 체감하세요.

1. **let → var 함정 만들기**: `let g`를 그대로 두고, `color = color * shade;` 줄을 `g = g * shade;`로 바꿔보세요. 어떤 컴파일 에러가 나는지 읽어보세요. (그리고 되돌리세요.)
2. **변환 빼먹기 함정**: `let uv = pixel / size;`를 `let uv = vec2f(gid.xy) / vec2f(dims);` 대신 일부러 `let uv = vec2f(gid.xy / dims);`(정수 나눗셈 먼저)로 바꿔, 화면이 어떻게 망가지는지 보세요. 왜 그런지 정수 나눗셈으로 설명하세요.
3. **체커보드 칸 크기**: `/ 32`를 `/ 16`이나 `/ 64`로 바꿔 칸 크기가 어떻게 변하는지 관찰하세요.
4. **색 바꾸기**: `gradientColor`의 `vec3f(uv.x, uv.y, 0.5)`에서 채널 순서를 `vec3f(0.5, uv.x, uv.y)`로 바꿔 그라데이션 색이 어떻게 도는지 보세요.
