# Image Credits

이 파일은 `docs/assets/external/` 에 둔 **외부 이미지**의 출처와 라이선스를 기록합니다.
Wikipedia/Wikimedia 등에서 `curl` 로 이미지를 받을 때마다 아래 형식으로 항목을 추가하세요.
(시각자료 규약은 `CLAUDE.md` 참고. 비자유(fair-use) 이미지는 사용 금지.)

형식:

```markdown
- `external/<파일명>` — Author: <저작자>, Source: <원본 URL>, License: <라이선스 + 링크>
```

받기 예시:

```bash
curl -L -o docs/assets/external/conv.gif "<wikimedia-file-url>"
```

## 항목

- `external/2d-convolution-animation.gif` — Author: Michael Plotke, Source: https://commons.wikimedia.org/wiki/File:2D_Convolution_Animation.gif, License: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/) — 원본을 가공하지 말 것 (5장 convolution 슬라이딩 애니메이션)
- `external/cnn-3-filters.gif` — Author: Cecbur, Source: https://commons.wikimedia.org/wiki/File:3_filters_in_a_Convolutional_Neural_Network.gif, License: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — 원본을 가공하지 말 것 (16장: filter 3개가 입력을 읽어 feature map 3개를 만드는 conv layer)
