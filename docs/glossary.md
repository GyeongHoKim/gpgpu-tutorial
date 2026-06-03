# 용어집 (한·영 대조)

새로 등장하는 영어 용어를 한국어 설명과 함께 모읍니다. 챕터에서 용어가 처음 나오면 여기에 추가하세요.

| 용어 | 뜻 |
|------|------|
| GPGPU | General-Purpose computing on GPU. GPU 를 그래픽 외 일반 계산에 쓰는 것 |
| compute shader | GPU 에서 화면 출력 없이 일반 계산을 수행하는 셰이더 |
| invocation | compute shader 의 실행 단위 하나. 보통 픽셀 하나에 대응 |
| workgroup | invocation 들의 묶음. `@workgroup_size` 로 크기 지정 |
| dispatch | compute 작업을 GPU 에 제출하는 것. workgroup 개수를 지정 |
| texture | GPU 의 이미지 데이터. 픽셀(texel) 격자 |
| texel | texture 의 한 원소(픽셀) |
| storage texture | 셰이더가 직접 써넣을 수 있는 텍스처 |
| bind group | 셰이더에 넘기는 리소스(텍스처·버퍼) 묶음 |
| blit | 텍스처를 화면(canvas)에 그려 내보내는 것 |
| dot product (내적) | 두 벡터의 같은 자리 원소를 곱해 더한 값 |
| convolution | 주변 픽셀 벡터와 kernel 벡터의 내적으로 새 픽셀을 만드는 연산 |
| kernel | convolution 의 가중치 행렬 (예: 3×3) |
| feature map | conv layer 의 출력 채널들. 각 채널이 한 종류의 특징 |
| residual | 기본 결과에 더하는 보정값 |
| luma | 색의 밝기 성분. RGB 와 가중치 벡터의 내적 |
